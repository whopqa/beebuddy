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

## 3. Xác minh email và reset mật khẩu

Mặc định development dùng `EMAIL_DELIVERY_MODE=console`: backend in mã xác minh và đường dẫn reset ra terminal, đồng thời web hiển thị tiện ích local để test nhanh. Production cần SMTP hoặc Resend API theo `backend/.env.example`; trên Railway Trial/Free/Hobby phải dùng HTTPS API vì SMTP bị chặn.

1. Mở `/signup`, tạo tài khoản bằng email chưa tồn tại và mật khẩu tối thiểu 8 ký tự có chữ và số.
2. Xác nhận được chuyển tới `/verify-code`; nhập mã 6 số trong terminal backend.
3. Thử nhập sai mã; mã đúng phải xác minh tài khoản và tạo phiên đăng nhập.
4. Đăng xuất, mở `/forgot-password` và nhập email vừa đăng ký.
5. Mở liên kết reset trong terminal hoặc liên kết local development trên màn hình.
6. Đặt mật khẩu mới rồi xác nhận mật khẩu cũ không đăng nhập được, mật khẩu mới đăng nhập được.
7. Xác nhận các phiên đăng nhập trước khi reset đều bị thu hồi.
8. Thử mở lại cùng liên kết reset; hệ thống phải báo token đã dùng hoặc hết hạn.

### Google Sign-In

1. Tạo OAuth client loại **Web application** trong Google Cloud Console.
2. Thêm `http://localhost:3000` vào **Authorized JavaScript origins**.
3. Điền cùng một client ID vào `NEXT_PUBLIC_GOOGLE_CLIENT_ID` trong `.env.local` của web và `GOOGLE_CLIENT_ID` trong `backend/.env`.
4. Khởi động lại cả backend và web; nút Google chỉ xuất hiện khi web có client ID.
5. Ở `/signup`, tích đồng ý TERMS/PRIVACY rồi đăng ký bằng Google; tài khoản phải được tạo ở trạng thái verified và có gói FREE.
6. Đăng xuất rồi dùng cùng Google Account ở `/login`; hệ thống phải dùng lại user/identity cũ và tạo session mới.
7. Nếu email Gmail đã có tài khoản BeeBuddy, lần đăng nhập Google đầu tiên phải liên kết identity vào đúng user thay vì tạo user trùng.

## 4. Luồng user chính

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
5. Với owner, bấm `Quản lý`: sửa tên/mô tả/quyền riêng tư/cách tham gia, tải ảnh đại diện và ảnh bìa.
6. Đổi community sang `Cần phê duyệt`; dùng User 2 gửi yêu cầu, owner duyệt hoặc từ chối trong bảng quản lý.
7. Owner nâng một member thành moderator rồi hạ quyền; moderator không được thay đổi vai trò hoặc chuyển owner.
8. Thử xóa, cấm và khôi phục member; số lượng thành viên phải cập nhật đúng.
9. Owner mời một người đã kết nối; tài khoản được mời thấy khối `Lời mời tham gia` và có thể chấp nhận/từ chối.
10. Thử lưu trữ, chuyển owner và xóa mềm community bằng dữ liệu development.

### Bảng tin chính — `/feed`

1. Đăng một bài chỉ có nội dung, sau đó tải lại trang và xác nhận bài vẫn xuất hiện.
2. Đăng một bài có từ 1 đến 4 ảnh; xác nhận thứ tự ảnh và bố cục hiển thị đúng.
3. Sửa nội dung, xóa bớt/thêm ảnh và đổi quyền xem; tải lại để xác nhận dữ liệu mới.
4. Với quyền `Người được chọn`, chọn ít nhất một kết nối; tài khoản không được chọn không được thấy bài.
5. Dùng User 2 thích/bỏ thích bài của User 1; số lượt thích phải tăng/giảm đúng và giữ nguyên sau khi reload.
6. Dùng User 2 báo cáo bài của User 1; không thể tự báo cáo bài của mình và báo cáo trùng đang mở không tạo thêm bản ghi.
7. User 1 xóa bài và xác nhận bài biến mất khỏi bảng tin; user khác không được sửa/xóa bài đó.

### Tin nhắn — `/messages`

1. Mở chat với User 2 từ kết nối hoặc query `?user=<userId>`.
2. Gửi tin nhắn từ User 1.
3. Kiểm tra User 2 nhận được thông báo và tin nhắn xuất hiện sau lần polling tiếp theo.
4. Trả lời từ User 2 và kiểm tra ở User 1.
5. Mở hai trình duyệt cạnh nhau: tin nhắn mới phải xuất hiện ngay, không cần bấm làm mới hoặc chờ polling.
6. Khi User 2 đang mở cuộc trò chuyện, dưới tin nhắn của User 1 phải chuyển từ `Đã gửi` sang `Đã xem`.
7. Đóng User 2, gửi nhiều tin từ User 1, sau đó mở lại User 2; toàn bộ tin đến mốc mới nhất phải có read receipt.
8. Tắt backend vài giây: nhãn realtime chuyển sang `Đang kết nối lại`; khi backend hoạt động, EventSource tự kết nối lại và polling 30 giây vẫn là fallback.

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

## 5. Luồng admin

Đăng xuất user, đăng nhập `admin@beebuddy.vn`, rồi mở `/admin`.

1. Dashboard: số user, thuê bao, doanh thu và kiểm duyệt phải lấy từ database.
2. Users: tìm kiếm; đổi tier của một user; khóa với lý do; xác nhận user bị từ chối đăng nhập; sau đó mở khóa lại.
3. Payments: tìm đơn vừa tạo bằng email hoặc `orderCode`; lọc trạng thái `PENDING`.
4. Moderation / Bài viết: kiểm tra bài vừa bị User 2 báo cáo, thử `Duyệt` hoặc `Ẩn` và xác nhận bài rời hàng đợi.
5. Moderation / Bình luận: với bình luận bị report/flagged, thử `Duyệt` hoặc `Ẩn` và xác nhận hàng đợi cập nhật.
6. Moderation / Báo cáo: thử `Bỏ qua` và `Đã xử lý`; một báo cáo đã đóng không được xử lý lần hai.
7. Moderation / Từ cấm: thêm rồi xóa một từ cấm thử nghiệm.
8. Audit Log: lọc `POST`, kiểm tra thao tác duyệt/ẩn có actor admin, trạng thái trước/sau và đúng target ID.

## 6. Kết quả tự động hiện tại

```powershell
cd backend
npm.cmd run build
npm.cmd test

cd ..
npx.cmd tsc --noEmit
npm.cmd run build
```

Kỳ vọng: backend compile; 50/50 test pass; web TypeScript pass; Next.js build đủ 50 trang/route; mobile typecheck và lint pass.

## 7. Phạm vi chưa phải luồng production hoàn chỉnh

- Google Sign-In đã có trên web nhưng chỉ hiển thị sau khi cấu hình OAuth client ID; Apple Sign-In được chủ động bỏ qua vì chưa có Apple Developer credentials.
- Thanh toán local tạo đơn và QR thật theo cấu hình development, nhưng không giả lập webhook thành công.
- Upload ảnh cho avatar, bài viết community và tin nhắn đã có; voice/video media, call audio/video và push notification worker chưa có giao diện vận hành hoàn chỉnh.

## 8. Upload ảnh (avatar, bảng tin, community, tin nhắn)

1. Mở `/account/edit`, chọn ảnh JPEG/PNG/WebP/GIF dưới 4 MB, lưu và reload `/account`; avatar mới phải còn hiển thị.
2. Đổi tên file văn bản hoặc SVG thành `.png` rồi thử upload; API phải từ chối do chữ ký file không hợp lệ.
3. Vào `/feed`, chọn tối đa 4 ảnh, đăng bài và reload; ảnh phải hiển thị theo đúng thứ tự, đồng thời vẫn sửa/xóa được bài.
4. Vào một community đã tham gia, chọn tối đa 4 ảnh, đăng bài và reload; ảnh phải hiển thị theo đúng thứ tự.
5. Vào `/messages`, chọn tối đa 4 ảnh, có thể thêm lời nhắn rồi gửi; cả hai thành viên cuộc trò chuyện phải xem được ảnh.
6. Người không có quyền xem bài hoặc không thuộc cuộc trò chuyện gọi URL ảnh tương ứng phải nhận 403.
7. File development được lưu dưới `backend/uploads`; thư mục này bị Git bỏ qua. Trước production phải thay adapter local bằng object storage bền vững.
