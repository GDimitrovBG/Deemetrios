package com.deemetrios.tgsaver.tg

import android.content.Context
import android.os.Build
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.drinkless.tdlib.Client
import org.drinkless.tdlib.TdApi
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/** Thrown when TDLib answers a request with an error. */
class TdException(val code: Int, override val message: String) : Exception("TDLib $code: $message")

sealed interface AuthStage {
    data object Starting : AuthStage
    /** api_id / api_hash are not configured yet. */
    data object NeedApiCredentials : AuthStage
    data object WaitPhone : AuthStage
    data class WaitCode(val phone: String) : AuthStage
    data class WaitPassword(val hint: String) : AuthStage
    data class WaitOtherDevice(val link: String) : AuthStage
    data object WaitRegistration : AuthStage
    data object Ready : AuthStage
    data object LoggedOut : AuthStage
    data class Failed(val reason: String) : AuthStage
}

/**
 * Thin coroutine wrapper around the official TDLib Java client.
 *
 * The whole app shares one client: TDLib keeps the Telegram session, the local
 * message database and the file cache in the app's private storage.
 */
object TgClient {

    private var client: Client? = null
    private lateinit var appContext: Context

    private val _auth = MutableStateFlow<AuthStage>(AuthStage.Starting)
    val auth: StateFlow<AuthStage> = _auth.asStateFlow()

    /** Emits every updateFile so downloads can follow progress. */
    val fileUpdates = MutableSharedFlow<TdApi.File>(extraBufferCapacity = 256)

    private val knownChats = ConcurrentHashMap<Long, TdApi.Chat>()

    @Volatile private var apiId: Int = 0
    @Volatile private var apiHash: String = ""

    fun isStarted(): Boolean = client != null

    fun start(context: Context, apiId: Int, apiHash: String) {
        appContext = context.applicationContext
        this.apiId = apiId
        this.apiHash = apiHash
        if (client != null) return
        Client.setLogMessageHandler(0) { _, _ -> }
        try {
            Client.execute(TdApi.SetLogVerbosityLevel(1))
        } catch (_: Throwable) {
        }
        client = Client.create({ update -> onUpdate(update) }, null, null)
    }

    private fun onUpdate(update: TdApi.Object) {
        when (update) {
            is TdApi.UpdateAuthorizationState -> onAuthState(update.authorizationState)
            is TdApi.UpdateFile -> fileUpdates.tryEmit(update.file)
            is TdApi.UpdateNewChat -> knownChats[update.chat.id] = update.chat
            else -> Unit
        }
    }

    private fun onAuthState(state: TdApi.AuthorizationState) {
        when (state) {
            is TdApi.AuthorizationStateWaitTdlibParameters -> sendParameters()
            is TdApi.AuthorizationStateWaitPhoneNumber -> _auth.value = AuthStage.WaitPhone
            is TdApi.AuthorizationStateWaitEmailAddress -> _auth.value = AuthStage.WaitPhone
            is TdApi.AuthorizationStateWaitCode ->
                _auth.value = AuthStage.WaitCode(state.codeInfo?.phoneNumber ?: "")
            is TdApi.AuthorizationStateWaitPassword ->
                _auth.value = AuthStage.WaitPassword(state.passwordHint ?: "")
            is TdApi.AuthorizationStateWaitOtherDeviceConfirmation ->
                _auth.value = AuthStage.WaitOtherDevice(state.link ?: "")
            is TdApi.AuthorizationStateWaitRegistration -> _auth.value = AuthStage.WaitRegistration
            is TdApi.AuthorizationStateReady -> _auth.value = AuthStage.Ready
            is TdApi.AuthorizationStateClosed -> {
                client = null
                knownChats.clear()
                _auth.value = AuthStage.LoggedOut
            }
            is TdApi.AuthorizationStateLoggingOut -> _auth.value = AuthStage.LoggedOut
            else -> Unit
        }
    }

    private fun sendParameters() {
        val dbDir = File(appContext.filesDir, "tdlib").apply { mkdirs() }
        val filesDir = File(appContext.cacheDir, "tdlib-files").apply { mkdirs() }
        val params = TdApi.SetTdlibParameters(
            false,                       // useTestDc
            dbDir.absolutePath,          // databaseDirectory
            filesDir.absolutePath,       // filesDirectory
            ByteArray(0),                // databaseEncryptionKey
            true,                        // useFileDatabase
            true,                        // useChatInfoDatabase
            true,                        // useMessageDatabase
            false,                       // useSecretChats
            apiId,
            apiHash,
            "bg",
            Build.MODEL ?: "Android",
            "Android ${Build.VERSION.RELEASE}",
            "1.0"
        )
        client?.send(params) { result ->
            if (result is TdApi.Error) {
                _auth.value = AuthStage.Failed("${result.code}: ${result.message}")
            }
        }
    }

    /** Sends a TDLib request and suspends until the answer arrives. */
    suspend fun <T : TdApi.Object> send(query: TdApi.Function<T>): T {
        val c = client ?: throw TdException(0, "TDLib клиентът не е стартиран")
        val deferred = CompletableDeferred<T>()
        c.send(query, { result ->
            if (result is TdApi.Error) {
                deferred.completeExceptionally(TdException(result.code, result.message))
            } else {
                @Suppress("UNCHECKED_CAST")
                deferred.complete(result as T)
            }
        }, { e -> deferred.completeExceptionally(e) })
        return deferred.await()
    }

    /** Same as [send] but returns null instead of throwing. */
    suspend fun <T : TdApi.Object> sendOrNull(query: TdApi.Function<T>): T? = try {
        send(query)
    } catch (e: Throwable) {
        null
    }

    suspend fun setPhone(phone: String) {
        val settings = TdApi.PhoneNumberAuthenticationSettings(
            false, false, false, false, false, null, emptyArray()
        )
        send(TdApi.SetAuthenticationPhoneNumber(phone, settings))
    }

    suspend fun checkCode(code: String) = send(TdApi.CheckAuthenticationCode(code))

    suspend fun checkPassword(password: String) =
        send(TdApi.CheckAuthenticationPassword(password))

    suspend fun logOut() {
        sendOrNull(TdApi.LogOut())
    }

    fun cachedChat(chatId: Long): TdApi.Chat? = knownChats[chatId]
}
