package com.deemetrios.tgsaver.tg

import org.drinkless.tdlib.TdApi
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Reads chats and media out of TDLib. */
object TgRepository {

    private val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US)

    /** Loads the main chat list, most recent first. */
    suspend fun loadChats(limit: Int = 300): List<ChatItem> {
        // Ask TDLib to pull chats from the server into its local list.
        var rounds = 0
        while (rounds++ < 20) {
            try {
                TgClient.send(TdApi.LoadChats(TdApi.ChatListMain(), limit))
            } catch (e: TdException) {
                break // 404 = no more chats to load
            }
            val known = TgClient.sendOrNull(TdApi.GetChats(TdApi.ChatListMain(), limit))
            if ((known?.chatIds?.size ?: 0) >= limit) break
        }
        val ids = TgClient.sendOrNull(TdApi.GetChats(TdApi.ChatListMain(), limit))?.chatIds
            ?: longArrayOf()
        return ids.toList().mapNotNull { id ->
            val chat = TgClient.cachedChat(id) ?: TgClient.sendOrNull(TdApi.GetChat(id))
            chat?.let { toChatItem(it) }
        }
    }

    private fun toChatItem(chat: TdApi.Chat): ChatItem {
        val kind = when (chat.type) {
            is TdApi.ChatTypePrivate -> "Личен чат"
            is TdApi.ChatTypeSecret -> "Таен чат"
            is TdApi.ChatTypeBasicGroup -> "Група"
            is TdApi.ChatTypeSupergroup ->
                if ((chat.type as TdApi.ChatTypeSupergroup).isChannel) "Канал" else "Група"
            else -> ""
        }
        return ChatItem(
            id = chat.id,
            title = chat.title.ifBlank { "Чат ${chat.id}" },
            photoFileId = chat.photo?.small?.id,
            photoMinithumb = chat.photo?.minithumbnail?.data,
            kind = kind
        )
    }

    /**
     * Walks the whole chat history for the given filter, oldest page last.
     * [onPage] is called for every batch so the UI can fill in progressively.
     */
    suspend fun scanMedia(
        chatId: Long,
        filter: MediaFilter,
        pageSize: Int = 100,
        onPage: suspend (List<MediaItem>, Int) -> Unit
    ) {
        var fromMessageId = 0L
        var scanned = 0
        while (true) {
            val found = TgClient.sendOrNull(
                TdApi.SearchChatMessages(
                    chatId,
                    null,                 // topicId - whole chat
                    "",                   // query
                    null,                 // senderId
                    fromMessageId,
                    0,                    // offset
                    pageSize,
                    filter.toTd()
                )
            ) ?: break

            val messages = found.messages ?: emptyArray()
            if (messages.isEmpty()) break

            val items = messages.mapNotNull { toMediaItem(it) }
            scanned += messages.size
            onPage(items, scanned)

            val next = found.nextFromMessageId
            if (next == 0L || next == fromMessageId) break
            fromMessageId = next
        }
    }

    private fun toMediaItem(msg: TdApi.Message): MediaItem? {
        val date = msg.date
        val datePart = stamp.format(Date(date.toLong() * 1000L))
        return when (val content = msg.content) {
            is TdApi.MessagePhoto -> {
                val best = content.photo?.sizes?.maxByOrNull { it.width.toLong() * it.height }
                    ?: return null
                val small = content.photo?.sizes?.minByOrNull { it.width.toLong() * it.height }
                MediaItem(
                    chatId = msg.chatId,
                    messageId = msg.id,
                    date = date,
                    kind = MediaKind.PHOTO,
                    fileId = best.photo.id,
                    fileSize = maxOf(best.photo.size, best.photo.expectedSize),
                    thumbFileId = small?.photo?.id,
                    miniThumb = content.photo?.minithumbnail?.data,
                    suggestedName = "IMG_$datePart.jpg",
                    mimeType = "image/jpeg",
                    durationSec = 0
                )
            }
            is TdApi.MessageVideo -> {
                val v = content.video ?: return null
                MediaItem(
                    chatId = msg.chatId,
                    messageId = msg.id,
                    date = date,
                    kind = MediaKind.VIDEO,
                    fileId = v.video.id,
                    fileSize = maxOf(v.video.size, v.video.expectedSize),
                    thumbFileId = v.thumbnail?.file?.id,
                    miniThumb = v.minithumbnail?.data,
                    suggestedName = cleanName(v.fileName, "VID_$datePart.mp4"),
                    mimeType = v.mimeType?.ifBlank { "video/mp4" } ?: "video/mp4",
                    durationSec = v.duration
                )
            }
            is TdApi.MessageAnimation -> {
                val a = content.animation ?: return null
                MediaItem(
                    chatId = msg.chatId,
                    messageId = msg.id,
                    date = date,
                    kind = MediaKind.GIF,
                    fileId = a.animation.id,
                    fileSize = maxOf(a.animation.size, a.animation.expectedSize),
                    thumbFileId = a.thumbnail?.file?.id,
                    miniThumb = a.minithumbnail?.data,
                    suggestedName = cleanName(a.fileName, "GIF_$datePart.mp4"),
                    mimeType = a.mimeType?.ifBlank { "video/mp4" } ?: "video/mp4",
                    durationSec = a.duration
                )
            }
            is TdApi.MessageDocument -> {
                val d = content.document ?: return null
                val mime = d.mimeType ?: ""
                val kind = when {
                    mime.startsWith("image/") -> MediaKind.PHOTO
                    mime.startsWith("video/") -> MediaKind.VIDEO
                    else -> MediaKind.FILE
                }
                MediaItem(
                    chatId = msg.chatId,
                    messageId = msg.id,
                    date = date,
                    kind = kind,
                    fileId = d.document.id,
                    fileSize = maxOf(d.document.size, d.document.expectedSize),
                    thumbFileId = d.thumbnail?.file?.id,
                    miniThumb = d.minithumbnail?.data,
                    suggestedName = cleanName(d.fileName, "DOC_$datePart"),
                    mimeType = mime.ifBlank { "application/octet-stream" },
                    durationSec = 0
                )
            }
            else -> null
        }
    }

    private fun cleanName(raw: String?, fallback: String): String {
        val name = raw?.trim().orEmpty().replace(Regex("[\\\\/:*?\"<>|]"), "_")
        return if (name.isBlank()) fallback else name
    }
}
