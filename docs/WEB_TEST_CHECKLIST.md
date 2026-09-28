# BeeBuddy — checklist test web end-to-end

## 1. Khởi động

Mở hai terminal tại thư mục `web`.

Terminal backend:

```powershell
cd backend
npm.cmd run dev
```

Terminal web:

```powershell
npm.cmd run dev
```

Mở `http://localhost:3000`. Backend mặc định chạy ở `http://localhost:5000`.

Nếu cần tạo lại dữ liệu development:

```powershell
cd backend
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

## 2. Tài khoản development

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@beebuddy.vn` | `admin123456` |
| User 1 | `hoang.pham@beebuddy.vn` | `user123456` |
| User 2 | `trang.le@beebuddy.vn` | `user123456` |
| User 3 | `minh.nguyen@beebuddy.vn` | `user123456` |

Nên dùng cửa sổ thường cho User 1 và cửa sổ ẩn danh/trình duyệt khác cho User 2 để test kết nối và tin nhắn hai chiều.

## 3. Luồng user chính

### Dashboard — `/home`

1. Đăng nhập bằng User 1.
2. Ghi một mood check-in và mức năng lượng.
3. Tạo routine mới, đánh dấu hoàn thành, tạm dừng rồi bật lại.
4. Bấm làm mới gợi ý Buzzy; thử chấp nhận hoặc bỏ qua một gợi ý.
5. Tạo memory sau khi xác nhận consent; thử thu hồi memory.
6. Tải lại trang và xác nhận dữ liệu vẫn còn đúng.

### Khám phá và kết nối — `/discover`

1. Chạy tạo gợi ý ghép đôi.
2. Gửi lời mời kết nối đến User 2.
3. Ở trình duyệt User 2, mở Notifications và chấp nhận lời mời.
4. Quay lại User 1, làm mới và xác nhận trạng thái đã kết nối.

### Community — `/community`

1. Tạo community.
2. Tham gia/rời một community công khai.
3. Tạo bài viết trong community.
4. Mở chi tiết bài, thêm bình luận và kiểm tra số liệu cập nhật.

### Tin nhắn — `/messages`

1. Mở chat với User 2 từ kết nối hoặc query `?user=<userId>`.
2. Gửi tin nhắn từ User 1.
3. Kiểm tra User 2 nhận được thông báo và tin nhắn xuất hiện sau lần polling tiếp theo.
4. Trả lời từ User 2 và kiểm tra ở User 1.

### Tài khoản — `/account`, `/settings`, `/security`

1. Sửa hồ sơ và tải lại trang.
2. Đổi privacy/notification/language/theme trong Settings.
3. Đăng nhập cùng tài khoản ở cửa sổ thứ hai.
4. Mở Security ở cửa sổ thứ nhất: cả hai phiên phải xuất hiện, một phiên được đánh dấu hiện tại.
5. Thu hồi phiên còn lại hoặc dùng “Đăng xuất phiên khác”; request tiếp theo ở cửa sổ bị thu hồi phải yêu cầu đăng nhập lại.
6. Đổi mật khẩu chỉ khi muốn kết thúc toàn bộ phiên; sau đó đăng nhập lại bằng mật khẩu mới.

### Billing — `/billing`

1. Chọn VIP hoặc PRO và bấm thanh toán VietQR.
2. Xác nhận có `orderCode`, số tiền, nội dung chuyển khoản và ảnh QR.
3. Bấm kiểm tra trạng thái; trong development trạng thái dự kiến là `PENDING`.
4. Không tự sửa `COMPLETED` trong database. Quyền gói chỉ được cấp khi backend nhận webhook PayOS có chữ ký hợp lệ.

## 4. Luồng admin

Đăng xuất user, đăng nhập `admin@beebuddy.vn`, rồi mở `/admin`.

1. Dashboard: số user, thuê bao, doanh thu và kiểm duyệt phải lấy từ database.
2. Users: tìm kiếm; đổi tier của một user; khóa với lý do; xác nhận user bị từ chối đăng nhập; sau đó mở khóa lại.
3. Payments: tìm đơn vừa tạo bằng email hoặc `orderCode`; lọc trạng thái `PENDING`.
4. Moderation: thêm rồi xóa một từ cấm thử nghiệm.
5. Nếu có bình luận bị report/flagged, thử Approve hoặc Hide và xác nhận hàng đợi cập nhật.

## 5. Kết quả tự động hiện tại

```powershell
cd backend
npm.cmd run build
npm.cmd test

cd ..
npx.cmd tsc --noEmit
npm.cmd run build
```

Kỳ vọng: backend compile; 34/34 test pass; web TypeScript pass; Next.js build đủ 41 trang/route.

## 6. Phạm vi chưa phải luồng production hoàn chỉnh

- Google/Apple OAuth chưa có provider credentials nên nút social login chỉ thông báo chưa kết nối.
- Thanh toán local tạo đơn và QR thật theo cấu hình development, nhưng không giả lập webhook thành công.
- Call audio/video, upload media và push notification worker chưa có giao diện vận hành hoàn chỉnh.
