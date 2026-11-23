# JVM проверки срещу истинския TDLib

Приложението не може да се пусне на емулатор (TDLib е компилиран за `arm64-v8a`,
а x86 емулацията иска хардуерно ускорение), затова логиката за Telegram се
проверява на Linux, срещу същата версия на TDLib.

| Тест | Какво доказва |
|---|---|
| `AuthFlowTest.java` | `setTdlibParameters` с точно същите позиционни аргументи като в `TgClient.kt` се приема с `Ok`, и състоянието стига до `authorizationStateWaitPhoneNumber` |
| `QueryShapeTest.java` | всяка заявка, която приложението праща (`searchChatMessages` с четирите филтъра, `loadChats`, `getChats`, `getChat`, `downloadFile`, `cancelDownloadFile`, `deleteFile`, стъпките за код и парола) се сериализира и достига TDLib |

Без сесия TDLib отговаря `401 Unauthorized` — точно това е доказателството:
заявката е коректна, липсва само вход. Деформирана заявка би дала грешка при
сериализация или изключение в JNI.

## Как се пускат

```bash
# 1. TDLib core за Linux, с JNI интерфейс
git clone --depth 1 https://github.com/tdlib/td && cd td
cmake -B ../td-host -DCMAKE_BUILD_TYPE=Release -DTD_ENABLE_JNI=ON \
      -DCMAKE_INSTALL_PREFIX=example/java/td -GNinja .
cmake --build ../td-host --target install -j4

# 2. libtdjni.so + генерираните Java класове
cmake -B ../td-java -DTd_DIR=$PWD/example/java/td/lib/cmake/Td -GNinja example/java
cmake --build ../td-java -j4

# 3. Компилиране и пускане
javac -d classes example/java/org/drinkless/tdlib/{Client,TdApi}.java
javac -cp classes -d classes /път/до/tools/*.java
java -Djava.library.path=../td-java -cp classes AuthFlowTest   ./work
java -Djava.library.path=../td-java -cp classes QueryShapeTest ./work
```

`setAuthenticationPhoneNumber` в `AuthFlowTest` показва TIMEOUT, когато
машината няма пряк TCP достъп до сървърите на Telegram (например зад HTTPS
прокси). Това не е дефект в приложението.
