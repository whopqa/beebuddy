# BeeBuddy mobile (Expo)

Ứng dụng Android dùng chung **backend và PostgreSQL** với website. Điện thoại chỉ gọi REST API trong `../backend`; tuyệt đối không đưa `DATABASE_URL` hoặc JWT secret vào ứng dụng.

## Chạy thử trên máy

1. Chuẩn bị PostgreSQL và backend theo `../backend/.env.example`, sau đó tại `../backend` chạy `npm install`, `npx prisma generate`, `npx prisma db push`, `npm run dev`. `db push` chỉ phù hợp để khởi tạo môi trường phát triển; trước khi deploy dữ liệu thật cần tạo và kiểm thử Prisma migration.
2. Tại thư mục này chạy `npm install` (nếu chưa cài).
3. Tạo `.env.local` từ `.env.example`; sửa `EXPO_PUBLIC_API_URL`:
   - Android emulator: `http://10.0.2.2:5000`.
   - Điện thoại thật cùng Wi-Fi: `http://<IPv4-LAN-của-máy-tính>:5000` (không dùng `localhost`).
   - APK dùng thật: URL **HTTPS công khai** của backend đã deploy.
4. Chạy `npm start`, quét QR bằng Expo Go hoặc `npm run android` với emulator đã cài.

Kiểm tra backend ở `http://localhost:5000/health`. Nếu app báo không kết nối được API, kiểm tra IP LAN, firewall, cổng 5000 và `DATABASE_URL` của backend. `EXPO_PUBLIC_API_URL` là địa chỉ công khai nằm trong app, **không phải nơi để lưu bí mật**.

## Xuất APK

`eas.json` có profile `preview` với `android.buildType = apk`. Sau khi có backend HTTPS và cấu hình `EXPO_PUBLIC_API_URL` cho môi trường build, chạy:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile preview
```

EAS sẽ yêu cầu đăng nhập/liên kết dự án Expo và thiết lập khóa ký Android ở lần build đầu. Chỉ sau khi build thành công mới có file APK; repo này hiện **chưa chứa APK**. Không dùng địa chỉ `10.0.2.2` hoặc IP LAN cho APK phát cho người khác.

## Phạm vi hiện tại

- Khách: xem feed bài viết công khai.
- Thành viên: đăng ký, đăng nhập, khôi phục phiên, xem tài khoản và feed theo quyền.
- Chưa triển khai chat, community, tạo bài viết, thanh toán hay giao diện bám sát từng frame Figma. Các luồng này cần đối chiếu với bản kiểm kê Figma hoàn chỉnh và bổ sung backend tương ứng.

Chạy `npm run typecheck` và `npm run lint` trước khi commit.
