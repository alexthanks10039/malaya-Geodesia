# Архивный банк модулей: Studio Password Auth

Этот каталог хранит отключённую, но рабочую реализацию парольной авторизации Studio.

## Сейчас
Парольная авторизация намеренно отключена в актуальной версии `feature/studio-v4`.

## Что сохранено
- `admin-auth.password.ts` — прежняя реализация `ADMIN_PASSWORD + ADMIN_SESSION_SECRET`, HMAC-сессия и cookie.
- `login-route.password.ts` — прежний POST endpoint входа по паролю.

## Переменные окружения для возврата
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET` (минимум 32 символа)
- опционально `STUDIO_AUTH_DISABLED=true` для аварийного обхода auth

## Как вернуть позже
1. Скопировать содержимое `admin-auth.password.ts` обратно в `lib/admin-auth.ts`.
2. Вернуть login route из `login-route.password.ts`.
3. Проверить все Studio guards и переменные окружения.
4. Выполнить `npm run lint` и `npm run build`.
5. Только после успешной сборки включать пароль на production.

В архиве нет реальных секретов и паролей, только код авторизации.
