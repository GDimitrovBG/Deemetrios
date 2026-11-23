package com.deemetrios.tgsaver

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.deemetrios.tgsaver.tg.AuthStage
import com.deemetrios.tgsaver.tg.ChatItem
import com.deemetrios.tgsaver.tg.MediaFilter
import com.deemetrios.tgsaver.tg.MediaItem
import com.deemetrios.tgsaver.tg.TgClient
import com.deemetrios.tgsaver.tg.TgRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class UiState(
    val needsSetup: Boolean = true,
    val busy: Boolean = false,
    val error: String? = null,
    val info: String? = null,
    val chats: List<ChatItem> = emptyList(),
    val chatQuery: String = "",
    val openChat: ChatItem? = null,
    val filter: MediaFilter = MediaFilter.ALL,
    val media: List<MediaItem> = emptyList(),
    val scanning: Boolean = false,
    val scanned: Int = 0,
    val selected: Set<String> = emptySet()
)

class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val prefs = app.getSharedPreferences("tgsaver", Context.MODE_PRIVATE)

    private val _ui = MutableStateFlow(UiState(needsSetup = true))
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    val auth: StateFlow<AuthStage> = TgClient.auth
    val downloads = Downloader.state

    private var scanJob: Job? = null

    private val hasApiCredentials: Boolean
        get() = prefs.getInt("api_id", 0) != 0 && !prefs.getString("api_hash", "").isNullOrBlank()

    init {
        _ui.value = _ui.value.copy(needsSetup = !hasApiCredentials)
        if (hasApiCredentials) startClient()
    }

    fun saveApiCredentials(apiId: String, apiHash: String) {
        val id = apiId.trim().toIntOrNull()
        val hash = apiHash.trim()
        if (id == null || id <= 0) {
            _ui.value = _ui.value.copy(error = "api_id трябва да е число")
            return
        }
        if (hash.length < 20) {
            _ui.value = _ui.value.copy(error = "api_hash изглежда непълен (32 знака)")
            return
        }
        prefs.edit().putInt("api_id", id).putString("api_hash", hash).apply()
        _ui.value = _ui.value.copy(needsSetup = false, error = null)
        startClient()
    }

    /** Lets the user re-enter api_id / api_hash when Telegram rejected them. */
    fun forgetApiCredentials() {
        prefs.edit().remove("api_id").remove("api_hash").apply()
        _ui.value = UiState(needsSetup = true)
    }

    fun restartClient() {
        if (hasApiCredentials) startClient()
    }

    private fun startClient() {
        TgClient.start(
            getApplication(),
            prefs.getInt("api_id", 0),
            prefs.getString("api_hash", "") ?: ""
        )
        viewModelScope.launch {
            TgClient.auth.collect { stage ->
                if (stage is AuthStage.Ready && _ui.value.chats.isEmpty()) loadChats()
            }
        }
    }

    fun submitPhone(phone: String) = run("Невалиден номер") { TgClient.setPhone(phone) }
    fun submitCode(code: String) = run("Грешен код") { TgClient.checkCode(code.trim()) }
    fun submitPassword(pass: String) = run("Грешна парола") { TgClient.checkPassword(pass) }

    fun logOut() {
        viewModelScope.launch {
            TgClient.logOut()
            _ui.value = UiState()
        }
    }

    private fun run(errorPrefix: String, block: suspend () -> Unit) {
        viewModelScope.launch {
            _ui.value = _ui.value.copy(busy = true, error = null)
            try {
                block()
                _ui.value = _ui.value.copy(busy = false)
            } catch (e: Throwable) {
                _ui.value = _ui.value.copy(busy = false, error = "$errorPrefix: ${e.message}")
            }
        }
    }

    fun loadChats() {
        viewModelScope.launch(Dispatchers.IO) {
            _ui.value = _ui.value.copy(busy = true, error = null)
            try {
                val chats = TgRepository.loadChats()
                _ui.value = _ui.value.copy(busy = false, chats = chats)
            } catch (e: Throwable) {
                _ui.value = _ui.value.copy(busy = false, error = "Чатовете не се заредиха: ${e.message}")
            }
        }
    }

    fun setChatQuery(q: String) {
        _ui.value = _ui.value.copy(chatQuery = q)
    }

    fun openChat(chat: ChatItem) {
        _ui.value = _ui.value.copy(
            openChat = chat, media = emptyList(), selected = emptySet(), scanned = 0
        )
        scan()
    }

    fun closeChat() {
        scanJob?.cancel()
        _ui.value = _ui.value.copy(
            openChat = null, media = emptyList(), selected = emptySet(), scanning = false
        )
    }

    fun setFilter(filter: MediaFilter) {
        if (filter == _ui.value.filter) return
        _ui.value = _ui.value.copy(filter = filter, media = emptyList(), selected = emptySet())
        scan()
    }

    fun scan() {
        val chat = _ui.value.openChat ?: return
        scanJob?.cancel()
        scanJob = viewModelScope.launch(Dispatchers.IO) {
            _ui.value = _ui.value.copy(scanning = true, scanned = 0, error = null)
            try {
                TgRepository.scanMedia(chat.id, _ui.value.filter) { page, scanned ->
                    val merged = (_ui.value.media + page).distinctBy { it.uniqueKey }
                    _ui.value = _ui.value.copy(media = merged, scanned = scanned)
                }
                _ui.value = _ui.value.copy(scanning = false)
            } catch (e: Throwable) {
                _ui.value = _ui.value.copy(
                    scanning = false,
                    error = "Сканирането спря: ${e.message}"
                )
            }
        }
    }

    fun toggle(item: MediaItem) {
        val sel = _ui.value.selected.toMutableSet()
        if (!sel.add(item.uniqueKey)) sel.remove(item.uniqueKey)
        _ui.value = _ui.value.copy(selected = sel)
    }

    fun selectAll() {
        _ui.value = _ui.value.copy(selected = _ui.value.media.map { it.uniqueKey }.toSet())
    }

    fun clearSelection() {
        _ui.value = _ui.value.copy(selected = emptySet())
    }

    /** Puts the selected items (or everything, when nothing is ticked) in the queue. */
    fun downloadSelected() {
        val state = _ui.value
        val chat = state.openChat ?: return
        val items = if (state.selected.isEmpty()) {
            state.media
        } else {
            state.media.filter { it.uniqueKey in state.selected }
        }
        if (items.isEmpty()) return
        Downloader.resetCounters()
        Downloader.enqueue(items, chat.title)
        DownloadService.start(getApplication())
        _ui.value = state.copy(
            selected = emptySet(),
            info = "В опашката: ${items.size} файла"
        )
    }

    fun cancelDownloads() = Downloader.cancelAll()

    fun dismissMessages() {
        _ui.value = _ui.value.copy(error = null, info = null)
    }
}
