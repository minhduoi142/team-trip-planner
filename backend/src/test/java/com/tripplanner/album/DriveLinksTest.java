package com.tripplanner.album;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DriveLinksTest {

    private static final String ID = "1AbCdEfGhIjKlMnOp_QrStUv-wXyZ";

    @Test
    void fileLinksOfAllCommonShapes() {
        assertThat(DriveLinks.fileId("https://drive.google.com/file/d/" + ID + "/view?usp=sharing")).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/file/d/" + ID + "/view")).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/file/u/0/d/" + ID + "/view")).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/open?id=" + ID)).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/uc?id=" + ID + "&export=download")).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/uc?export=download&id=" + ID)).contains(ID);
        assertThat(DriveLinks.fileId("https://drive.google.com/thumbnail?id=" + ID + "&sz=w800")).contains(ID);
        assertThat(DriveLinks.fileId("  https://drive.google.com/file/d/" + ID + "/view  ")).contains(ID);
    }

    @Test
    void folderLinks() {
        assertThat(DriveLinks.folderId("https://drive.google.com/drive/folders/" + ID + "?usp=sharing")).contains(ID);
        assertThat(DriveLinks.folderId("https://drive.google.com/drive/u/0/folders/" + ID)).contains(ID);
    }

    @Test
    void folderAndFileAreNotMixedUp() {
        assertThat(DriveLinks.fileId("https://drive.google.com/drive/folders/" + ID)).isEmpty();
        assertThat(DriveLinks.folderId("https://drive.google.com/file/d/" + ID + "/view")).isEmpty();
    }

    @Test
    void rejectsNonDriveAndMalformed() {
        assertThat(DriveLinks.fileId("https://photos.app.goo.gl/abcdefghijk")).isEmpty();
        assertThat(DriveLinks.fileId("https://evil.com/file/d/" + ID + "/view")).isEmpty();
        assertThat(DriveLinks.fileId("https://drive.google.com.evil.com/file/d/" + ID)).isEmpty();
        assertThat(DriveLinks.fileId("javascript:alert(1)")).isEmpty();
        assertThat(DriveLinks.fileId("https://drive.google.com/file/d/short/view")).isEmpty();
        assertThat(DriveLinks.fileId("https://drive.google.com/open?id=bad id")).isEmpty();
        assertThat(DriveLinks.fileId("")).isEmpty();
        assertThat(DriveLinks.fileId(null)).isEmpty();
        assertThat(DriveLinks.folderId("not a url at all")).isEmpty();
    }

    @Test
    void derivedUrls() {
        assertThat(DriveLinks.viewUrl(ID)).isEqualTo("https://drive.google.com/file/d/" + ID + "/view");
        assertThat(DriveLinks.thumbnailUrl(ID)).isEqualTo("https://drive.google.com/thumbnail?id=" + ID + "&sz=w800");
    }
}
