package com.tripplanner.document;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.document.DocumentEnums.FileType;
import com.tripplanner.document.DocumentEnums.Visibility;
import com.tripplanner.document.dto.DocumentDtos.DocumentListResponse;
import com.tripplanner.document.dto.DocumentDtos.DocumentRequest;
import com.tripplanner.document.dto.DocumentDtos.DocumentResponse;
import com.tripplanner.document.dto.DocumentDtos.FileInfo;
import com.tripplanner.media.StorageService;
import com.tripplanner.media.StorageService.StoredObject;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.UserRepository;
import java.io.IOException;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ví giấy tờ chuyến đi (docs/sdd-trip-documents.md). Quyền:
 * <ul>
 *   <li>xem: SHARED → mọi thành viên; PRIVATE → chỉ người tạo. Không xem được thì trả 404 (không lộ là có tồn tại);</li>
 *   <li>sửa/xóa/đổi file: SHARED → người tạo hoặc OWNER; PRIVATE → chỉ người tạo.</li>
 * </ul>
 * File nằm ở bucket riêng tư; object cũ chỉ xóa SAU KHI commit (rollback thì file vẫn còn dùng được).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    /** Như upload ảnh (MediaService.MAX_BYTES); servlet cũng chặn multipart ở 10 MB. */
    static final long MAX_BYTES = 10L * 1024 * 1024;
    static final int MAX_FILE_NAME = 150;

    private static final Comparator<TripDocument> ORDER = Comparator
            .comparing(TripDocument::getStartsAt, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(TripDocument::getCreatedAt)
            .thenComparing(TripDocument::getId);

    private final TripAccessService accessService;
    private final TripDocumentRepository repository;
    private final UserRepository userRepository;
    private final StorageService storage;

    @Transactional(readOnly = true)
    public DocumentListResponse list(Long tripId, Long userId) {
        return build(accessService.require(tripId, userId, TripRole.VIEWER));
    }

    @Transactional
    public DocumentListResponse create(Long tripId, Long userId, DocumentRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        TripDocument doc = TripDocument.builder()
                .tripId(tripId)
                .createdBy(userRepository.getReferenceById(userId))
                .build();
        apply(doc, request);
        repository.saveAndFlush(doc);
        return build(me);
    }

    @Transactional
    public DocumentListResponse update(Long documentId, Long userId, DocumentRequest request) {
        Access access = requireEditable(documentId, userId);
        apply(access.doc(), request);
        repository.flush();
        return build(access.me());
    }

    @Transactional
    public DocumentListResponse delete(Long documentId, Long userId) {
        Access access = requireEditable(documentId, userId);
        String oldKey = access.doc().getFileKey();
        repository.delete(access.doc());
        repository.flush();
        deleteAfterCommit(oldKey == null ? List.of() : List.of(oldKey));
        return build(access.me());
    }

    @Transactional
    public DocumentListResponse replaceFile(Long documentId, Long userId, MultipartFile file) {
        Access access = requireEditable(documentId, userId);
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Chưa chọn file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException(ErrorCode.FILE_TOO_LARGE, "File quá lớn, tối đa 10 MB");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Không đọc được file");
        }
        FileType type = FileType.detect(bytes)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNSUPPORTED_DOCUMENT_TYPE));
        TripDocument doc = access.doc();
        String key = "documents/" + doc.getTripId() + "/" + UUID.randomUUID() + "." + type.extension();
        String oldKey = doc.getFileKey();
        storage.putPrivate(key, bytes, type.contentType());
        // Đăng ký ngay sau khi tải lên: ghi DB lỗi → rollback → xóa object vừa tải; thành công → xóa object cũ
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    if (oldKey != null) {
                        storage.deletePrivate(oldKey);
                    }
                } else {
                    storage.deletePrivate(key);
                }
            }
        });

        doc.setFileKey(key);
        doc.setFileType(type.contentType());
        doc.setFileName(fileName(file.getOriginalFilename(), type));
        doc.setFileSize(bytes.length);
        repository.flush();
        return build(access.me());
    }

    @Transactional
    public DocumentListResponse removeFile(Long documentId, Long userId) {
        Access access = requireEditable(documentId, userId);
        String oldKey = access.doc().getFileKey();
        access.doc().clearFile();
        repository.flush();
        deleteAfterCommit(oldKey == null ? List.of() : List.of(oldKey));
        return build(access.me());
    }

    /** File để stream về: chỉ ai XEM được giấy tờ. */
    @Transactional(readOnly = true)
    public DownloadedFile download(Long documentId, Long userId) {
        TripDocument doc = requireVisible(documentId, userId).doc();
        if (doc.getFileKey() == null) {
            throw new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND, "Giấy tờ này không có file");
        }
        StoredObject object = storage.getPrivate(doc.getFileKey());
        return new DownloadedFile(object.content(), doc.getFileType(), doc.getFileName());
    }

    public record DownloadedFile(byte[] content, String contentType, String fileName) {
    }

    // ---------------------------------------------------------------- dọn dẹp khi rời nhóm / xóa chuyến

    /**
     * Loại thành viên: giấy tờ PRIVATE của họ bị xóa cùng file (không ai còn xem được); SHARED giữ lại.
     * Gọi trong transaction của TripMemberService.
     */
    public void deletePrivateOfMember(Long tripId, Long userId) {
        List<TripDocument> docs = repository.findPrivateOf(tripId, userId);
        if (docs.isEmpty()) {
            return;
        }
        List<String> keys = docs.stream().map(TripDocument::getFileKey).filter(k -> k != null).toList();
        repository.deleteAllByIds(docs.stream().map(TripDocument::getId).toList());
        deleteAfterCommit(keys);
    }

    /** Xóa chuyến: dòng đi theo CASCADE, object riêng tư phải xóa tay sau khi commit. */
    public void deleteFilesOfTripAfterCommit(Long tripId) {
        deleteAfterCommit(repository.findFileKeysByTripId(tripId));
    }

    // ---------------------------------------------------------------- helpers

    private void deleteAfterCommit(Collection<String> keys) {
        if (keys.isEmpty()) {
            return;
        }
        List<String> copy = List.copyOf(keys);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            copy.forEach(storage::deletePrivate);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                copy.forEach(storage::deletePrivate);
            }
        });
    }

    private void apply(TripDocument doc, DocumentRequest r) {
        if (r.startsAt() != null && r.endsAt() != null && r.endsAt().isBefore(r.startsAt())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Giờ kết thúc phải sau giờ bắt đầu");
        }
        doc.setKind(r.kind());
        doc.setTitle(r.title().trim());
        doc.setBookingCode(blankToNull(r.bookingCode()));
        doc.setStartsAt(r.startsAt());
        doc.setEndsAt(r.endsAt());
        doc.setPlace(blankToNull(r.place()));
        doc.setContactName(blankToNull(r.contactName()));
        doc.setContactPhone(blankToNull(r.contactPhone()));
        doc.setNote(blankToNull(r.note()));
        doc.setVisibility(r.visibility());
    }

    private DocumentListResponse build(TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isOwner = me.getRole() == TripRole.OWNER;
        List<DocumentResponse> rows = repository.findVisible(me.getTrip().getId(), myId).stream()
                .sorted(ORDER)
                .map(d -> new DocumentResponse(d.getId(), d.getKind(), d.getTitle(), d.getBookingCode(),
                        d.getStartsAt(), d.getEndsAt(), d.getPlace(), d.getContactName(), d.getContactPhone(),
                        d.getNote(), d.getVisibility(),
                        d.getFileKey() == null ? null : new FileInfo(d.getFileType(), d.getFileName(), d.getFileSize()),
                        d.getCreatedBy() == null ? null : d.getCreatedBy().getDisplayName(),
                        d.isCreatedBy(myId), canEdit(d, myId, isOwner), d.getUpdatedAt()))
                .toList();
        return new DocumentListResponse(rows);
    }

    static boolean canEdit(TripDocument d, Long userId, boolean isOwner) {
        return d.isCreatedBy(userId) || (d.getVisibility() == Visibility.SHARED && isOwner);
    }

    private record Access(TripDocument doc, TripMember me) {
    }

    /** Giấy tờ PRIVATE của người khác coi như không tồn tại. */
    private Access requireVisible(Long documentId, Long userId) {
        TripDocument doc = repository.findById(documentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
        TripMember me = accessService.require(doc.getTripId(), userId, TripRole.VIEWER);
        if (doc.getVisibility() == Visibility.PRIVATE && !doc.isCreatedBy(userId)) {
            throw new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND);
        }
        return new Access(doc, me);
    }

    private Access requireEditable(Long documentId, Long userId) {
        Access access = requireVisible(documentId, userId);
        if (!canEdit(access.doc(), userId, access.me().getRole() == TripRole.OWNER)) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Chỉ người tạo hoặc Trưởng nhóm mới sửa/xóa được giấy tờ này");
        }
        return access;
    }

    /** Tên file người dùng đặt (bỏ đường dẫn, cắt 150 ký tự); trống → "giay-to.{ext}". */
    static String fileName(String original, FileType type) {
        String name = original == null ? "" : original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}\"]", "").trim();
        if (!StringUtils.hasText(name)) {
            name = "giay-to." + type.extension();
        }
        return name.length() <= MAX_FILE_NAME ? name : name.substring(name.length() - MAX_FILE_NAME);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
