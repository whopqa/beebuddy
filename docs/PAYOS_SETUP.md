# Thiết lập PayOS chính thức cho BeeBuddy

BeeBuddy gọi API PayOS hoàn toàn từ backend. Không đưa Client ID, API Key hoặc Checksum Key vào biến môi trường public của Next.js.

## 1. Chuẩn bị tài khoản PayOS

1. Đăng ký tại `https://my.payos.vn`.
2. Chọn **Tài khoản cá nhân/Hộ kinh doanh** nếu đây là đồ án cá nhân.
3. Xác thực CCCD và liên kết tài khoản ngân hàng chính chủ.
4. Tạo **Kênh thanh toán** và sao chép `Client ID`, `API Key`, `Checksum Key`.

## 2. Cấu hình backend

Điền vào `backend/.env`:

```env
PAYOS_CLIENT_ID=gia_tri_client_id_that
PAYOS_API_KEY=gia_tri_api_key_that
PAYOS_CHECKSUM_KEY=gia_tri_checksum_key_that
PAYOS_RETURN_URL=http://localhost:3000/billing?status=success
PAYOS_CANCEL_URL=http://localhost:3000/billing?status=cancelled
PAYOS_PAYMENT_LINK_TTL_MINUTES=15
```

Khởi động lại backend sau khi thay đổi `.env`.

## 3. Cấu hình webhook

PayOS không gọi được `localhost`. Khi phát triển, hãy dùng một HTTPS tunnel trỏ tới web Next.js và đặt webhook URL là:

```text
https://TEN-MIEN-CONG-KHAI/api/payments/webhook
```

Trong production dùng chính domain web, ví dụ:

```text
https://beebuddy.example.com/api/payments/webhook
```

Vào **Kênh thanh toán → Webhook URL** trong PayOS để lưu URL này. Endpoint chấp nhận sự kiện mẫu có chữ ký hợp lệ khi PayOS kiểm tra URL.

## 4. Kiểm thử an toàn

PayOS hiện không có sandbox riêng, vì vậy mọi giao dịch là giao dịch thật.

1. Đăng nhập BeeBuddy và mở `/billing`.
2. Chọn VIP hoặc PRO.
3. Nhấn **Mở cổng PayOS**.
4. Thanh toán một gói test có giá trị nhỏ.
5. Quay lại `/billing`; trạng thái sẽ được đồng bộ bằng webhook hoặc API PayOS.
6. Kiểm tra `Payment.status = COMPLETED`, `Subscription.status = ACTIVE` và `User.tierExpiresAt` trong PostgreSQL.

Không dùng nút thanh toán nhiều lần cho cùng một lần kiểm thử và không chia sẻ ba khóa PayOS trong ảnh chụp hoặc GitHub.
