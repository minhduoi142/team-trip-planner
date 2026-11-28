package com.tripplanner.document;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.document.dto.DocumentDtos.DocumentListResponse;
import com.tripplanner.document.dto.DocumentDtos.DocumentRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Ví giấy tờ chuyến đi. Mọi thao tác ghi trả lại toàn bộ danh sách người gọi được thấy. File không có URL công khai:
 * tải qua {@code GET /documents/{id}/file} (cần đăng nhập + quyền xem).
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Ví giấy tờ chuyến đi (vé, đặt phòng, bảo hiểm…), file ở kho riêng tư")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping("/trips/{tripId}/documents")
    @Operation(summary = "Giấy tờ chung + giấy tờ riêng của chính mình")
    public DocumentListResponse list(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return documentService.list(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm giấy tờ (mọi thành viên)")
    public DocumentListResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                       @Valid @RequestBody DocumentRequest request) {
        return documentService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/documents/{documentId}")
    @Operation(summary = "Sửa giấy tờ (chung: người tạo / OWNER; riêng: chỉ người tạo)")
    public DocumentListResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long documentId,
                                       @Valid @RequestBody DocumentRequest request) {
        return documentService.update(documentId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/documents/{documentId}")
    @Operation(summary = "Xóa giấy tờ (kèm file)")
    public DocumentListResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long documentId) {
        return documentService.delete(documentId, CurrentUser.id(jwt));
    }

    @PutMapping(value = "/documents/{documentId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Gắn / thay file (ảnh JPG/PNG/WebP hoặc PDF, tối đa 10 MB)")
    public DocumentListResponse replaceFile(@AuthenticationPrincipal Jwt jwt, @PathVariable Long documentId,
                                            @RequestParam("file") MultipartFile file) {
        return documentService.replaceFile(documentId, CurrentUser.id(jwt), file);
    }

    @DeleteMapping("/documents/{documentId}/file")
    @Operation(summary = "Bỏ file đính kèm")
    public DocumentListResponse removeFile(@AuthenticationPrincipal Jwt jwt, @PathVariable Long documentId) {
        return documentService.removeFile(documentId, CurrentUser.id(jwt));
    }

    @GetMapping("/documents/{documentId}/file")
    @Operation(summary = "Tải file (ai xem được giấy tờ); không cache ở trình duyệt / proxy")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal Jwt jwt, @PathVariable Long documentId) {
        DocumentService.DownloadedFile file = documentService.download(documentId, CurrentUser.id(jwt));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.content());
    }
}
