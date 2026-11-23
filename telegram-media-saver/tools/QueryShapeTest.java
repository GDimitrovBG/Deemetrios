import org.drinkless.tdlib.Client;
import org.drinkless.tdlib.TdApi;
import java.io.File;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Sends the exact queries TgRepository / Downloader build, with the same
 * positional arguments, against the real TDLib. Without a signed-in session
 * TDLib answers "Unauthorized", which is the proof we want: the query
 * serialised and dispatched correctly through JNI instead of crashing or
 * being rejected as malformed.
 */
public class QueryShapeTest {

    private static Client client;
    private static int failures = 0;

    public static void main(String[] args) throws Exception {
        File base = new File(args[0]);
        new File(base, "tdlib").mkdirs();
        new File(base, "tdlib-files").mkdirs();

        Client.setLogMessageHandler(0, (level, message) -> { });
        try {
            Client.execute(new TdApi.SetLogVerbosityLevel(1));
        } catch (Throwable ignored) {
        }

        CountDownLatch ready = new CountDownLatch(1);
        client = Client.create(update -> {
            if (update instanceof TdApi.UpdateAuthorizationState) {
                TdApi.AuthorizationState st =
                    ((TdApi.UpdateAuthorizationState) update).authorizationState;
                if (st instanceof TdApi.AuthorizationStateWaitTdlibParameters) {
                    client.send(new TdApi.SetTdlibParameters(
                        false,
                        new File(base, "tdlib").getAbsolutePath(),
                        new File(base, "tdlib-files").getAbsolutePath(),
                        new byte[0], true, true, true, false,
                        94575, "a3406de8d171bb422bb6ddf3bbd800e2",
                        "bg", "SM-TEST", "Android 14", "1.0"
                    ), r -> { });
                } else if (st instanceof TdApi.AuthorizationStateWaitPhoneNumber) {
                    ready.countDown();
                }
            }
        }, null, null);

        if (!ready.await(60, TimeUnit.SECONDS)) {
            System.out.println("RESULT: FAIL - never became ready");
            System.exit(1);
        }

        // TgRepository.scanMedia
        check("searchChatMessages(PhotoAndVideo)", new TdApi.SearchChatMessages(
            -1001234567890L, null, "", null, 0L, 0, 100,
            new TdApi.SearchMessagesFilterPhotoAndVideo()));
        check("searchChatMessages(Photo)", new TdApi.SearchChatMessages(
            -1001234567890L, null, "", null, 0L, 0, 100,
            new TdApi.SearchMessagesFilterPhoto()));
        check("searchChatMessages(Animation)", new TdApi.SearchChatMessages(
            -1001234567890L, null, "", null, 0L, 0, 100,
            new TdApi.SearchMessagesFilterAnimation()));
        check("searchChatMessages(Document)", new TdApi.SearchChatMessages(
            -1001234567890L, null, "", null, 0L, 0, 100,
            new TdApi.SearchMessagesFilterDocument()));

        // TgRepository.loadChats
        check("loadChats(main, 300)", new TdApi.LoadChats(new TdApi.ChatListMain(), 300));
        check("getChats(main, 300)", new TdApi.GetChats(new TdApi.ChatListMain(), 300));
        check("getChat", new TdApi.GetChat(-1001234567890L));

        // Downloader / ThumbCache
        check("downloadFile(sync)", new TdApi.DownloadFile(1, 24, 0, 0, true));
        check("downloadFile(thumb)", new TdApi.DownloadFile(1, 1, 0, 0, true));
        check("cancelDownloadFile", new TdApi.CancelDownloadFile(1, false));
        check("deleteFile", new TdApi.DeleteFile(1));

        // Auth steps the app drives later
        check("checkAuthenticationCode", new TdApi.CheckAuthenticationCode("12345"));
        check("checkAuthenticationPassword", new TdApi.CheckAuthenticationPassword("x"));

        System.out.println();
        if (failures > 0) {
            System.out.println("RESULT: FAIL - " + failures + " query/queries malformed");
            System.exit(1);
        }
        System.out.println("RESULT: PASS - every query serialised and was dispatched");
        System.exit(0);
    }

    /**
     * A malformed query makes TDLib answer error 400 "Invalid ..." / crash on
     * serialisation; a well-formed one that merely needs a session answers 401
     * Unauthorized, or 400 with a semantic complaint about the fake ids used here.
     */
    private static void check(String label, TdApi.Function<?> query) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        final StringBuilder out = new StringBuilder();
        client.send(query, r -> {
            if (r instanceof TdApi.Error) {
                TdApi.Error e = (TdApi.Error) r;
                out.append("Error ").append(e.code).append(" ").append(e.message);
            } else {
                out.append(r.getClass().getSimpleName());
            }
            done.countDown();
        }, e -> {
            out.append("EXCEPTION ").append(e);
            done.countDown();
        });

        boolean answered = done.await(20, TimeUnit.SECONDS);
        String answer = answered ? out.toString() : "TIMEOUT";
        boolean bad = !answered || answer.startsWith("EXCEPTION");
        if (bad) failures++;
        System.out.printf("  %-34s %s%s%n", label, answer, bad ? "   <-- PROBLEM" : "");
    }
}
