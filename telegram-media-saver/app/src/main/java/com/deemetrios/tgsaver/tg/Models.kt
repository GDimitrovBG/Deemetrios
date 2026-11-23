package com.deemetrios.tgsaver.tg

import org.drinkless.tdlib.TdApi

data class ChatItem(
    val id: Long,
    val title: String,
    val photoFileId: Int?,
    val photoMinithumb: ByteArray?,
    val kind: String
) {
    override fun equals(other: Any?) = other is ChatItem && other.id == id
    override fun hashCode() = id.hashCode()
}

enum class MediaFilter(val label: String) {
    ALL("Снимки и видеа"),
    PHOTOS("Само снимки"),
    VIDEOS("Само видеа"),
    GIFS("GIF / анимации"),
    FILES("Файлове (документи)");

    fun toTd(): TdApi.SearchMessagesFilter = when (this) {
        ALL -> TdApi.SearchMessagesFilterPhotoAndVideo()
        PHOTOS -> TdApi.SearchMessagesFilterPhoto()
        VIDEOS -> TdApi.SearchMessagesFilterVideo()
        GIFS -> TdApi.SearchMessagesFilterAnimation()
        FILES -> TdApi.SearchMessagesFilterDocument()
    }
}

enum class MediaKind { PHOTO, VIDEO, GIF, FILE }

data class MediaItem(
    val chatId: Long,
    val messageId: Long,
    val date: Int,
    val kind: MediaKind,
    /** TDLib file id of the full-size original. */
    val fileId: Int,
    val fileSize: Long,
    /** Small preview that TDLib can download quickly; null when there is none. */
    val thumbFileId: Int?,
    /** Tiny JPEG blob that comes inline with the message - instant preview. */
    val miniThumb: ByteArray?,
    val suggestedName: String,
    val mimeType: String,
    val durationSec: Int
) {
    val uniqueKey: String get() = "$chatId:$messageId:$fileId"

    override fun equals(other: Any?) = other is MediaItem && other.uniqueKey == uniqueKey
    override fun hashCode() = uniqueKey.hashCode()
}
