# PHẠM VI WEBSITE BEEBUDDY VÀ ĐẶC TẢ ADMIN

> Chốt phạm vi: 23/09/2026  
> Ưu tiên: hoàn thiện Web trước khi tiếp tục các luồng Mobile App  
> Kiến trúc: một Next.js Web, khu vực User và `/admin` có layout/quyền riêng; dùng chung Express API và PostgreSQL với Mobile App

## 1. Vai trò của website

Website BeeBuddy không thay thế ứng dụng mobile. Web phục vụ bốn mục tiêu:

1. Giới thiệu sản phẩm và cung cấp thông tin pháp lý.
2. Cho khách khám phá một phần nội dung công khai và số liệu kết nối giới hạn.
3. Cho thành viên quản lý tài khoản dùng chung với app, bình luận và thanh toán gói.
4. Cho Admin vận hành user, payment và kiểm duyệt nội dung từ một khu vực riêng.

Mind map, site map, matching đầy đủ, tạo bài, kết nối, chat, community, gọi thoại/video và Mascot là phạm vi của Mobile App, không đưa vào bản Web User.

## 2. Ma trận quyền chính thức

| Chức năng | Guest | User | Admin |
|---|---:|---:|---:|
| Xem landing/giới thiệu | Có | Có | Có |
| Xem Cookies/Privacy/Terms | Có | Có | Có |
| Ghi nhận consent | Theo session | Theo user | Theo user |
| Xem danh sách gói | Có | Có | Có |
| Thanh toán/nâng cấp gói | Yêu cầu đăng nhập | Có | Không dùng luồng user |
| Xem lịch sử thanh toán của mình | Không | Có | Có dữ liệu quản trị riêng |
| Tìm thói quen/sở thích | Kết quả giới hạn | Kết quả web giới hạn | Có thể tra cứu phục vụ quản trị |
| Xem số người phù hợp | Có | Có | Có |
| Xem profile preview | Tối đa 3, che tên | Tối đa 3, che tên | Theo quyền Admin |
| Gửi kết nối | Không | Không trên web; CTA mở/tải app | Không |
| Xem post PUBLIC | Có | Có | Có |
| Xem post CONNECTIONS | Không | Chỉ khi đã kết nối với tác giả | Có khi kiểm duyệt |
| Đọc comment hợp lệ | Chỉ trên post PUBLIC nếu giữ chế độ public | Có | Có |
| Viết/report comment | Yêu cầu đăng nhập | Có | Admin dùng thao tác moderation |
| Tạo/upload post | Không | Không | Không tạo thay user |
| Sửa Account/Settings | Không | Có | Không sửa thay user, trừ khóa/tier |
| Vào `/admin` | Không | Không | Có |

## 3. Chức năng Web User

### 3.1. Public và pháp lý

- Landing page, giới thiệu BeeBuddy và CTA tải/mở app.
- Terms, Privacy Policy, Cookie Policy.
- Banner cookie có Accept/Reject/Customize; ghi nhận `UserConsent` theo session hoặc user.
- Guest không bị yêu cầu tạo tài khoản chỉ để xem nội dung public.

### 3.2. Authentication

- Register/login/logout bằng email/password qua backend thật.
- Access token ngắn hạn và refresh token có rotation/revoke.
- Web không còn `beebuddy-demo-session` ở luồng release.
- Login thành công:
  - `role=USER` → trang trước đó hoặc `/home`.
  - `role=ADMIN` → `/admin`.
- User thường truy cập `/admin` bị chuyển hướng và API trả 403.

### 3.3. Search preview

- Tìm theo một số `interests` và `habits` cơ bản.
- Trả tổng số người phù hợp.
- Chỉ hiển thị tối đa 3 profile preview, tên được che và không lộ email/id nhạy cảm.
- Không có nút Connect hoạt động trên web; dùng CTA “Mở BeeBuddy App để kết nối”.
- Rate limit để hạn chế dò tìm hàng loạt.

### 3.4. Social feed giới hạn

- Guest: xem post `PUBLIC`; không tạo/sửa/xóa post.
- User:
  - Xem post `PUBLIC`.
  - Xem post `CONNECTIONS` khi backend xác nhận quan hệ ACCEPTED.
  - Đọc comment hợp lệ và gửi comment/report.
- Web không có upload/create post.
- Post được tạo từ app sẽ xuất hiện trên web theo visibility.
- Mọi kiểm tra visibility thực hiện ở backend; không chỉ ẩn bằng giao diện.

### 3.5. Comment và lọc nội dung

- Comment từ web đi qua kiểm tra nội dung trước khi public.
- Lớp 1 bắt buộc: badword/rule-based filter nhanh và không phát sinh chi phí AI.
- Lớp 2 tùy chọn: AI moderation cho nội dung nghi ngờ hoặc post/comment mới từ app.
- Nội dung sạch → `APPROVED`.
- Nội dung nghi ngờ → `FLAGGED`, tạm ẩn và đưa vào Admin moderation.
- AI không tự khóa user và không xóa vĩnh viễn; quyết định nhạy cảm cần Admin.
- Lưu `reason`, nguồn phát hiện, model/rule version và thời điểm để audit.

### 3.6. Account và Settings

- Xem/sửa họ tên, avatar, bio, location, interests, habits và mục tiêu kết nối.
- Đổi mật khẩu.
- Profile visibility, email notification, language, theme.
- Hiển thị tier và ngày hết hạn.
- Thay đổi trên web ghi vào PostgreSQL và app đọc được sau refresh.

### 3.7. Payment

- Guest xem FREE/VIP/PRO và quyền lợi.
- User đăng nhập mới được tạo checkout.
- Tạo link/QR bằng PayOS thật; không dùng QR tài khoản ngân hàng hard-code.
- Webhook phải xác thực signature, amount, orderCode và xử lý idempotent.
- User xem trạng thái và lịch sử payment của chính mình.
- Payment COMPLETED cập nhật `User.tier/tierExpiresAt`; app nhận qua `/auth/me`.

## 4. Khu vực Admin riêng

Admin dùng cùng deployment nhưng có route group, layout và guard riêng tại `/admin`. Không cần tạo website/deployment thứ hai trong MVP; tách deployment chỉ cân nhắc khi có yêu cầu hạ tầng/bảo mật riêng.

### Trang Admin

| Route | Nội dung |
|---|---|
| `/admin` | Metrics thật: user, tier, revenue, report/comment/post cần duyệt |
| `/admin/users` | Tìm/lọc user, ban/unban, điều chỉnh tier có audit |
| `/admin/payments` | Tra cứu/đối soát payment; không tự đánh dấu COMPLETED thiếu bằng chứng |
| `/admin/moderation` | Duyệt/ẩn post và comment; xem reason AI/rule/report |
| `/admin/badwords` hoặc tab moderation | Thêm/tắt/xóa rule từ cấm |
| `/admin/audit-logs` | Ai đã làm gì, với đối tượng nào, lúc nào |

### Quy tắc Admin

- Admin không dùng UI User để tạo nội dung thay thành viên.
- Không cho Admin tự khóa mình; chưa có Super Admin thì không cho chỉnh Admin khác.
- Ban/unban, chỉnh tier, approve/hide đều tạo audit log.
- Không hiển thị password hash, refresh token, PayOS secret hoặc dữ liệu không cần thiết.
- UI hard-code hiện tại phải được thay bằng API thật trước release.

## 5. Ngoài phạm vi website

- Tạo, chỉnh sửa hoặc upload social post.
- Follow/connect/unfollow trực tiếp.
- Matching đầy đủ và danh sách profile không giới hạn.
- Chat 1-1/group, voice message, gọi thoại/video.
- Tạo/join/quản lý community/group.
- Stories, activity feed đầy đủ, notification realtime.
- Mascot AI cho người dùng.
- Mind map, site map và toàn bộ flow chi tiết dành cho app.

Các chức năng trên có thể dùng chung API/database về sau nhưng không xuất hiện trong Web User release hiện tại.

## 6. Thứ tự triển khai Web-first

| Đợt | Nội dung | Kết quả bàn giao |
|---|---|---|
| W0 | Baseline: env validation, migration, test framework | Backend/DB chạy lặp lại, có test auth cơ bản |
| W1 | Web auth thật và role guard | Mật khẩu sai bị chặn; User/Admin vào đúng khu vực |
| W2 | Account/Settings/Consent | Thông tin sửa trên web được app đọc lại |
| W3 | Public/Connections feed và comment | Guest/User thấy đúng post; comment qua moderation |
| W4 | Search preview giới hạn | Total + tối đa 3 profile che tên, không Connect trên web |
| W5 | Payment PayOS | Plans/checkout/status/history/tier sync an toàn |
| W6 | Admin thật | User/payment/moderation/badwords/audit từ API |
| W7 | AI moderation tùy chọn | Chỉ bổ sung sau khi rule-based và admin queue ổn định |
| W8 | UAT, security, deploy | Web/API production và checklist release PASS |

### Trạng thái thực hiện (23/09/2026)

- W0: **PASS ngày 23/09/2026** — có env validation, migration baseline đã áp dụng, kiểm tra user bị khóa theo DB, quyền post hai chiều, bảo vệ payment status/webhook và test tự động nền.
- W1: **PASS theo nghiệm thu của nhóm** — Web dùng auth thật, cookie HttpOnly, refresh token và role guard.
- W2: **đã triển khai, chờ nhóm nghiệm thu** — hồ sơ, settings, đổi mật khẩu và cookie consent dùng API/database thật.
- W3: **đã triển khai ngày 23/09/2026, chờ nhóm nghiệm thu** — feed/comment Web dùng database thật; Guest chỉ nhận `PUBLIC`; User nhận thêm `CONNECTIONS` đã chấp nhận theo cả hai chiều; comment sạch được duyệt, comment vi phạm được gắn cờ và tạo report; Web không có chức năng tạo post.
- W4: **đã triển khai ngày 23/09/2026, chờ nhóm nghiệm thu** — tìm sở thích/thói quen dùng database thật, không phân biệt hoa/thường; trả tổng số và tối đa 3 hồ sơ đã che tên; không cho Connect trên Web. Danh sách gợi ý phổ biến lấy qua API.
- Xem gói cước: **đã triển khai** — `/billing` lấy FREE/VIP/PRO và giá VND từ backend; thanh toán/checkout thật vẫn thuộc W5.
- Legal signup: **đã triển khai** — Web và Mobile bắt buộc đồng ý Terms/Privacy; backend từ chối request thiếu consent và tạo hai bản ghi `UserConsent` cùng transaction tạo user.
- W5–W8: chưa triển khai theo đặc tả Web-first.

## 7. Bảng nghiệm thu Web

| ID | Thao tác | Kết quả mong đợi |
|---|---|---|
| WEB-AUTH-01 | Login user bằng mật khẩu sai | Bị từ chối, không tạo session |
| WEB-AUTH-02 | Login `minh.nguyen@beebuddy.vn` đúng mật khẩu | Vào User web, hiện tier VIP |
| WEB-AUTH-03 | User thường mở `/admin` | Redirect/403 |
| WEB-AUTH-04 | Admin login đúng | Chuyển `/admin`, dữ liệu lấy từ DB |
| WEB-ACC-01 | Sửa bio trên web, reload app | App hiện bio mới |
| WEB-LEGAL-01 | Guest Accept cookie rồi reload | Không hỏi lại; consent có sessionId |
| WEB-FEED-01 | Guest mở feed | Chỉ có PUBLIC |
| WEB-FEED-02 | User mở feed | Có PUBLIC và CONNECTIONS được phép |
| WEB-FEED-03 | Tìm nút tạo/upload post trên web | Không tồn tại |
| WEB-CMT-01 | User comment sạch | APPROVED và hiển thị |
| WEB-CMT-02 | User comment vi phạm | FLAGGED, không public, Admin thấy trong queue |
| WEB-SRCH-01 | Guest tìm `Coding` | Có total, tối đa 3 preview che tên |
| WEB-SRCH-02 | Thử kết nối từ web | Chỉ CTA mở/tải app |
| WEB-PAY-01 | Guest xem plans | Xem được; checkout yêu cầu login |
| WEB-PAY-02 | Webhook sai chữ ký | Bị từ chối; tier không đổi |
| WEB-PAY-03 | Thanh toán sandbox thành công | Payment COMPLETED; web và app cùng tier |
| WEB-ADM-01 | Admin ban user | User bị chặn; audit log có bản ghi |
| WEB-ADM-02 | Admin approve/hide nội dung | Feed và moderation queue cập nhật đúng |

## 8. Prompt triển khai Admin riêng

```text
Hoàn thiện phân hệ BeeBuddy Web Admin tại /admin dựa trên docs/WEB_SCOPE_AND_ADMIN_SPEC.md và backend hiện có. Không thay đổi phạm vi Web User và không thêm chức năng tạo post trên web.

Yêu cầu:
1. Thay toàn bộ dữ liệu hard-code trong app/admin bằng REST API thật.
2. Bảo vệ cả UI và API bằng JWT role ADMIN; USER/GUEST phải bị 403 hoặc redirect phù hợp.
3. Hoàn thiện dashboard metrics, users ban/unban/tier, payments read-only/đối soát, moderation post/comment, badword rules và audit logs.
4. Mọi thao tác nhạy cảm phải validate bằng Zod, tạo audit log và có loading/error/empty/confirmation state.
5. Admin không được tự khóa mình, chỉnh Admin khác hoặc tự đánh dấu payment COMPLETED nếu không có webhook/luồng đối soát hợp lệ.
6. Moderation dùng rule-based filter bắt buộc; thiết kế adapter cho AI moderation nhưng không phụ thuộc khóa AI để hệ thống chạy.
7. Không lộ passwordHash, refresh token, JWT secret, PayOS secret hoặc dữ liệu riêng không cần thiết.
8. Thêm automated tests cho role guard và các thao tác Admin chính.
9. Kết thúc mỗi lát cắt phải chạy build/test và cung cấp bảng test thủ công gồm Test ID, bước làm, kết quả mong đợi và PASS/FAIL để người dùng tự xác nhận.
```

## 9. Điểm bắt đầu

Ưu tiên tiếp theo là W1 sau khi hoàn tất baseline tối thiểu: thay đăng nhập demo của Web bằng `/api/v1/auth/login`, quản lý session thật, thêm role redirect/guard và kiểm thử mật khẩu sai. Chưa triển khai payment hoặc Admin UI thật trước khi auth/role guard được xác nhận PASS.
