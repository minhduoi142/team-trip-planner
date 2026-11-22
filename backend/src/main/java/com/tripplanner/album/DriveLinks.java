package com.tripplanner.album;

import java.net.URI;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Đọc id file / thư mục từ link Google Drive và dựng các URL suy ra từ id. Class thuần để unit test.
 * Không gọi Drive API (app không xin quyền Drive).
 */
public final class DriveLinks {

    private static final String ID = "([A-Za-z0-9_-]{10,100})";
    private static final Pattern FILE_PATH = Pattern.compile("/file/(?:u/\\d+/)?d/" + ID);
    private static final Pattern FOLDER_PATH = Pattern.compile("/drive/(?:u/\\d+/)?folders/" + ID);
    private static final Pattern ID_PARAM = Pattern.compile("(?:^|&)id=" + ID + "(?:&|$)");
    private static final Pattern BARE_ID = Pattern.compile("^" + ID + "$");

    private DriveLinks() {
    }

    /** Id file từ link xem / open?id= / uc?id= / thumbnail?id=. Link thư mục → empty. */
    public static Optional<String> fileId(String link) {
        Optional<URI> uri = driveUri(link);
        if (uri.isEmpty()) {
            return Optional.empty();
        }
        String path = uri.get().getRawPath() == null ? "" : uri.get().getRawPath();
        if (FOLDER_PATH.matcher(path).find()) {
            return Optional.empty();
        }
        Matcher file = FILE_PATH.matcher(path);
        if (file.find()) {
            return Optional.of(file.group(1));
        }
        if (path.equals("/open") || path.equals("/uc") || path.equals("/thumbnail")) {
            return queryId(uri.get());
        }
        return Optional.empty();
    }

    /** Id thư mục từ link drive/folders/{id} (kể cả /u/0/). */
    public static Optional<String> folderId(String link) {
        return driveUri(link).flatMap(uri -> {
            Matcher m = FOLDER_PATH.matcher(uri.getRawPath() == null ? "" : uri.getRawPath());
            return m.find() ? Optional.of(m.group(1)) : Optional.empty();
        });
    }

    public static String viewUrl(String fileId) {
        return "https://drive.google.com/file/d/" + fileId + "/view";
    }

    public static String thumbnailUrl(String fileId) {
        return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w800";
    }

    public static boolean isValidId(String id) {
        return id != null && BARE_ID.matcher(id).matches();
    }

    private static Optional<String> queryId(URI uri) {
        String query = uri.getRawQuery();
        if (query == null) {
            return Optional.empty();
        }
        Matcher m = ID_PARAM.matcher(query);
        return m.find() ? Optional.of(m.group(1)) : Optional.empty();
    }

    /** Chỉ chấp nhận http(s)://drive.google.com/... */
    private static Optional<URI> driveUri(String link) {
        if (link == null || link.isBlank()) {
            return Optional.empty();
        }
        try {
            URI uri = URI.create(link.trim());
            boolean http = "https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme());
            return http && "drive.google.com".equalsIgnoreCase(uri.getHost()) ? Optional.of(uri) : Optional.empty();
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
