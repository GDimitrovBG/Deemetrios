import org.drinkless.tdlib.Client;
import org.drinkless.tdlib.TdApi;
import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Replays exactly the authorization sequence that TgClient.kt performs on the
 * phone, against the same TDLib version, to prove the positional
 * SetTdlibParameters arguments and the state machine are right.
 *
 * No real credentials: a placeholder api_id/api_hash is enough to reach
 * AuthorizationStateWaitPhoneNumber, which is where the app asks the user
 * for a phone number.
 */
public class AuthFlowTest {

    private static Client client;
    private static final CountDownLatch reachedWaitPhone = new CountDownLatch(1);
    private static volatile String failure = null;
    private static volatile boolean parametersAccepted = false;

    public static void main(String[] args) throws Exception {
        File base = new File(args[0]);
        File dbDir = new File(base, "tdlib");
        File filesDir = new File(base, "tdlib-files");
        dbDir.mkdirs();
        filesDir.mkdirs();

        Client.setLogMessageHandler(0, (level, message) -> { });
        try {
            Client.execute(new TdApi.SetLogVerbosityLevel(1));
        } catch (Throwable ignored) {
        }

        client = Client.create(update -> {
            if (update instanceof TdApi.UpdateAuthorizationState) {
                TdApi.AuthorizationState state =
                    ((TdApi.UpdateAuthorizationState) update).authorizationState;
                System.out.println("  auth state -> " + state.getClass().getSimpleName());

                if (state instanceof TdApi.AuthorizationStateWaitTdlibParameters) {
                    // Identical argument order to TgClient.sendParameters()
                    TdApi.SetTdlibParameters params = new TdApi.SetTdlibParameters(
                        false,                      // useTestDc
                        dbDir.getAbsolutePath(),    // databaseDirectory
                        filesDir.getAbsolutePath(), // filesDirectory
                        new byte[0],                // databaseEncryptionKey
                        true,                       // useFileDatabase
                        true,                       // useChatInfoDatabase
                        true,                       // useMessageDatabase
                        false,                      // useSecretChats
                        94575,                      // apiId (placeholder)
                        "a3406de8d171bb422bb6ddf3bbd800e2", // apiHash (placeholder)
                        "bg",
                        "SM-TEST",
                        "Android 14",
                        "1.0"
                    );
                    client.send(params, result -> {
                        if (result instanceof TdApi.Error) {
                            failure = "setTdlibParameters rejected: " + result;
                            reachedWaitPhone.countDown();
                        } else {
                            parametersAccepted = true;
                            System.out.println("  setTdlibParameters -> " +
                                result.getClass().getSimpleName());
                        }
                    });
                } else if (state instanceof TdApi.AuthorizationStateWaitPhoneNumber) {
                    reachedWaitPhone.countDown();
                } else if (state instanceof TdApi.AuthorizationStateClosed) {
                    failure = "client closed before reaching WaitPhoneNumber";
                    reachedWaitPhone.countDown();
                }
            }
        }, e -> {
            failure = "update handler threw: " + e;
            reachedWaitPhone.countDown();
        }, e -> {
            failure = "default handler threw: " + e;
            reachedWaitPhone.countDown();
        });

        boolean ok = reachedWaitPhone.await(60, TimeUnit.SECONDS);

        System.out.println();
        if (!ok) {
            System.out.println("RESULT: TIMEOUT - never reached WaitPhoneNumber");
            System.exit(1);
        }
        if (failure != null) {
            System.out.println("RESULT: FAIL - " + failure);
            System.exit(1);
        }
        if (!parametersAccepted) {
            System.out.println("RESULT: FAIL - parameters were never acknowledged");
            System.exit(1);
        }

        // Second half: the flow the app drives after the user types a phone number.
        // With a placeholder api_id Telegram answers with an error, which is
        // exactly what the app must surface rather than crash on.
        CountDownLatch phoneAnswered = new CountDownLatch(1);
        final StringBuilder phoneResult = new StringBuilder();
        TdApi.PhoneNumberAuthenticationSettings settings =
            new TdApi.PhoneNumberAuthenticationSettings(
                false, false, false, false, false, null, new String[0]);
        client.send(new TdApi.SetAuthenticationPhoneNumber("+359000000000", settings), r -> {
            phoneResult.append(r.getClass().getSimpleName());
            if (r instanceof TdApi.Error) {
                phoneResult.append(" code=").append(((TdApi.Error) r).code)
                           .append(" msg=").append(((TdApi.Error) r).message);
            }
            phoneAnswered.countDown();
        });
        boolean phoneOk = phoneAnswered.await(60, TimeUnit.SECONDS);
        System.out.println("  setAuthenticationPhoneNumber -> " +
            (phoneOk ? phoneResult.toString() : "TIMEOUT (no network?)"));

        System.out.println();
        System.out.println("RESULT: PASS - parameters accepted, reached WaitPhoneNumber");
        System.exit(0);
    }
}
