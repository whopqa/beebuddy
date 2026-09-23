# KẾ HOẠCH TRIỂN KHAI VÀ HƯỚNG DẪN TỰ KIỂM THỬ BEEBUDDY

> Ngày lập: 23/09/2026  
> Deadline mục tiêu: 15/10/2026  
> Nguồn yêu cầu: `docs/SYSTEM_DOCUMENTATION.md`  
> Phạm vi repo: Next.js Web + Express/Prisma API + Expo Android + PostgreSQL dùng chung

> **Cập nhật phạm vi 23/09/2026:** ưu tiên hoàn thiện Website trước Mobile App. Phạm vi Web User/Admin chính thức nằm tại `docs/WEB_SCOPE_AND_ADMIN_SPEC.md`. Các đợt mobile/chat/community trong tài liệu này chỉ tiếp tục sau khi Web W0–W8 được nghiệm thu.

## 1. Mục tiêu bàn giao ngày 15/10/2026

Bản bàn giao phải có thể chạy ngoài môi trường phát triển:

- Website được deploy, không còn dùng session hoặc dữ liệu demo ở các luồng chính.
- REST API được deploy qua HTTPS và kết nối PostgreSQL production.
- Android có file APK cài trực tiếp, gọi cùng API và cùng cơ sở dữ liệu với web.
- Người dùng đăng ký, đăng nhập, sửa hồ sơ, xem/tạo bài, bình luận, báo cáo, kết nối và chat chữ.
- Admin đăng nhập web để quản lý user, bài/bình luận vi phạm và giao dịch.
- Thanh toán chỉ được coi là hoàn thành khi webhook đã xác thực hợp lệ.
- Có migration, seed cho môi trường demo, kiểm thử API và checklist UAT.

### Đường cắt phạm vi bắt buộc

| Mức | Tính năng | Quyết định cho 15/10 |
|---|---|---|
| P0 | Email/password, JWT, hồ sơ, quyền riêng tư | Bắt buộc |
| P0 | Feed, tạo bài text/ảnh, bình luận, report, moderation | Bắt buộc |
| P0 | Kết nối bạn bè, community cơ bản, chat chữ 1-1 | Bắt buộc |
| P0 | Admin dữ liệu thật, PayOS sandbox/production, deploy, APK | Bắt buộc |
| P1 | Push notification cho tin nhắn/kết nối | Làm nếu P0 ổn định trước 10/10 |
| P1 | Group chat chữ | Làm nếu còn thời gian sau chat 1-1 |
| P2 | Voice message, gọi thoại/video | Sau 15/10; cần dịch vụ realtime/media và kiểm thử mạng |
| P2 | Mascot AI thật | Sau 15/10; trước mắt chỉ để UI/feature flag |
| P2 | Google/Apple login và in-app purchase | Sau 15/10; email/password và PayOS web là luồng chính |

Nếu nhóm bắt buộc cả P2 trong ngày 15/10 thì cần thêm người chuyên mobile/realtime, ngân sách dịch vụ và giảm yêu cầu kiểm thử. Với một luồng phát triển tuần tự, không nên cam kết chất lượng production cho toàn bộ P2.

## 2. Trạng thái thực tế ngày 23/09

| Khu vực | Đã có | Còn thiếu/rủi ro |
|---|---|---|
| Backend | Express, Prisma; auth, account, feed/comment, search, legal, payment, admin routes; migration baseline và test framework | Chưa có create post/like; checkout payment vẫn là VietQR minh họa; chưa có chat/community/notification/media |
| Web | Landing, auth, account và W3 feed/comment dùng API thật; billing và admin đã có giao diện | Danh bạ/tìm kiếm Community (W4), billing và admin vẫn còn dữ liệu hard-code/chưa nối API thật |
| Mobile | Expo Router; register/login; SecureStore; public/member feed; account; cấu hình APK | Chưa bám đủ Figma; chưa có profile edit, post, comment, connection, community, chat, notification |
| Database | 11 model nền tảng, seed mẫu và migration baseline | `SELECTED` chưa có bảng người nhận; chưa có PostLike, media metadata, community, conversation/message |
| Deployment | Có `.env.example` và mô tả định hướng | Chưa có DB/API/Web production URL, CORS production, health/readiness, logging, backup, APK đã ký |

### Các điểm phải sửa trước khi gọi là production

1. Webhook đã xác thực HMAC SHA256, số tiền/order và idempotency; vẫn phải test lại bằng PayOS sandbox trước khi bật production.
2. Server đã kiểm tra env và từ chối secret mẫu ở production; deployment vẫn phải cấp secret thực tế.
3. Web hiển thị admin metrics/user/payment giả; phải thay bằng API và bảo vệ route theo role.
4. Refresh token chưa có cơ chế thu hồi; cần bảng/session hoặc token rotation trước production.
5. Đã có migration baseline; mọi thay đổi schema tiếp theo phải tạo migration mới, không dùng `prisma db push` cho production.
6. Đã có test nền cho env, auth, quyền post và chữ ký payment; cần mở rộng integration/E2E trong các đợt W3–W8.

## 3. Nguyên tắc triển khai

- Mỗi đợt chỉ nhận một lát cắt có thể chạy từ UI → API → database.
- Không bắt đầu chat/community trước khi auth, migration và contract API ổn định.
- Web và mobile dùng chung kiểu dữ liệu/API contract; không nhân đôi business logic.
- Mọi thay đổi schema phải có Prisma migration và seed tương thích.
- Tính năng chưa hoàn thiện phải ẩn bằng feature flag, không để nút giả trong bản phát hành.
- Kết thúc mỗi đợt: build/lint/test tự động trước, sau đó mới giao bảng test thủ công cho người dùng.
- Chỉ chuyển đợt khi các test P0 của đợt hiện tại đều PASS hoặc có lỗi được ghi nhận rõ.

## 4. Lịch triển khai chi tiết

| Đợt | Thời gian | Kết quả đầu ra | Điều kiện hoàn thành |
|---|---|---|---|
| 0 | 23–24/09 | Baseline, migration đầu tiên, env validation, test harness, API contract | Web/backend/mobile build; DB seed được; test health/auth chạy |
| 1 | 25–27/09 | Auth và account thật trên web + mobile | Register/login/refresh/logout/profile/password/settings dùng DB chung |
| 2 | 28–30/09 | Feed hoàn chỉnh | Create post, ảnh, visibility, like, comment, report; web/mobile cùng thấy dữ liệu |
| 3 | 01–02/10 | Kết nối và tìm kiếm | Request/accept/reject/unfriend; privacy đúng; gợi ý/tìm kiếm chạy |
| 4 | 03–05/10 | Community cơ bản | Tạo/join/leave, role owner/member, feed community, giới hạn tier |
| 5 | 06–08/10 | Chat chữ 1-1 realtime | Conversation/message, phân trang, unread/read, reconnect; không lộ chat người khác |
| 6 | 09–10/10 | Admin và moderation dữ liệu thật | Metrics/users/reports/badwords hoạt động; audit log đầy đủ |
| 7 | 11/10 | PayOS an toàn | Checkout thật/sandbox, signature webhook, idempotency, tier sync web/mobile |
| 8 | 12–13/10 | Deploy staging/production | DB migration, API HTTPS, web URL, CORS, storage, log và backup |
| 9 | 14/10 | APK và UAT | APK signed cài được; test trên ít nhất 2 máy Android; sửa lỗi release blocker |
| 10 | 15/10 | Release 1.0 | Tag/release notes, APK final, tài liệu vận hành và rollback |

## 5. Nội dung và bảng tự test cho từng đợt

### Đợt 0 — Nền tảng có thể lặp lại

**Công việc**

- Chuẩn hóa `.env.example`; validate biến môi trường khi backend khởi động.
- Tạo migration baseline thay cho việc phụ thuộc `db push`.
- Thêm scripts chạy build/lint/test cho ba workspace.
- Thêm test API cho health, register, login, refresh, auth guard.
- Sửa các lỗi bảo mật nền rõ ràng trước khi mở rộng schema.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R0-01 | Chạy backend với `.env` hợp lệ, mở `http://localhost:5000/health` | HTTP 200, service `BeeBuddy REST API` |
| R0-02 | Tạo database rỗng, chạy migration rồi seed | Có admin, 3 user mẫu, badwords, post/comment mẫu; chạy seed lần hai không lỗi |
| R0-03 | Chạy bộ test backend | Tất cả test auth/guard PASS |
| R0-04 | Build web, backend; lint/typecheck mobile | Tất cả lệnh exit code 0 |
| R0-05 | Bỏ `JWT_SECRET` trong chế độ production rồi start backend | Server từ chối chạy với thông báo rõ ràng |

### Đợt 1 — Auth và tài khoản dùng dữ liệu thật

**Công việc**

- Thay `lib/demo.ts` ở luồng auth/account web bằng API client và session thật.
- Thêm logout, refresh rotation/revocation; chuẩn hóa lỗi 401/403.
- Hoàn thiện account/profile/settings/password trên web và mobile.
- Route `/admin` yêu cầu user role ADMIN ở cả UI và API.
- Quên mật khẩu/email verification chỉ làm nếu có email provider; nếu chưa có thì ẩn nút khỏi release.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R1-01 | Đăng ký trên web, đăng nhập cùng email trên app | Cùng `user.id`, cùng profile và tier |
| R1-02 | Sửa bio/location trên web, tải lại account app | App hiển thị giá trị mới từ DB |
| R1-03 | Đổi password, thử password cũ và mới | Cũ bị từ chối; mới đăng nhập thành công |
| R1-04 | Dùng user thường mở `/admin` và gọi `/api/v1/admin/metrics` | UI chặn/redirect; API trả 403 |
| R1-05 | Đăng xuất rồi mở lại app | Không còn phiên; route riêng tư bị chặn |
| R1-06 | Hết hạn access token nhưng refresh token hợp lệ | Phiên được làm mới một lần, không mất dữ liệu |

### Đợt 2 — Feed, bài viết và bình luận

**Công việc**

- Bổ sung PostLike, selected recipients/media metadata nếu giữ visibility `SELECTED`.
- API create/update/delete post, like/unlike, pagination/cursor.
- Upload ảnh qua storage; giới hạn loại file, kích thước và số lượng.
- Web hiển thị feed/comment thật; app có tạo bài và comment.
- Giữ bộ lọc badword và report; bổ sung authorization sửa/xóa.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R2-01 | Guest mở web và app | Chỉ thấy bài `PUBLIC` |
| R2-02 | User A tạo bài PUBLIC trên app rồi mở web | Bài xuất hiện trên web sau refresh |
| R2-03 | User A tạo bài CONNECTIONS; thử guest, người lạ và connection | Chỉ A và connection thấy bài |
| R2-04 | Like rồi unlike cùng bài | Mỗi user tối đa một like; counter không âm/không tăng trùng |
| R2-05 | Comment bình thường | Comment hiển thị với `APPROVED` |
| R2-06 | Comment chứa badword đã seed | Comment `FLAGGED`, không hiện công khai, xuất hiện trong admin moderation |
| R2-07 | Upload file sai loại/quá dung lượng | API từ chối; không tạo file rác hoặc post dở dang |

### W3 Web-first — Public/Connections feed và comment (đã triển khai 23/09/2026)

**Phạm vi đã hoàn thành**

- Web chỉ đọc feed, không có nút tạo/upload bài viết.
- Guest chỉ nhận bài `PUBLIC`; User nhận bài `PUBLIC`, bài của chính mình và bài `CONNECTIONS` của quan hệ `ACCEPTED` theo cả hai chiều.
- Feed có phân trang, loading/error/empty state, tác giả, visibility, media, số lượt thích và số bình luận lấy từ database.
- Guest được đọc comment của post có quyền xem nhưng phải đăng nhập để viết/report.
- Comment sạch có trạng thái `APPROVED`; comment chứa badword có trạng thái `FLAGGED`, chỉ người gửi thấy và backend tự tạo report `PENDING`.
- Giao diện giữ cấu trúc frame Explore/Comments trong Figma. Danh bạ và tìm kiếm người chưa thuộc W3, tiếp tục ở W4.

**Chuẩn bị**

1. PostgreSQL đang chạy và `backend/.env` có `DATABASE_URL` hợp lệ.
2. Terminal backend: `cd E:\Project\BeeBuddy\web\backend` rồi `npm.cmd run dev`.
3. Terminal web: `cd E:\Project\BeeBuddy\web` rồi `npm.cmd run dev`.
4. Mở `http://localhost:3000/community`, bấm **Explore** và cuộn đến **What's Buzzing**.

| ID | Cách tự test | Kết quả mong đợi | PASS/FAIL |
|---|---|---|---|
| W3-01 | Đăng xuất, mở Community → Explore | Chỉ thấy 2 bài mẫu có nhãn `Public`; không thấy bài `[Connections Only]` |  |
| W3-02 | Khi đang là Guest, mở `1 bình luận` ở bài của Minh | Thấy comment của Trang; cuối modal hiện `Đăng nhập để tham gia bình luận`, không có ô nhập |  |
| W3-03 | Đăng nhập user có connection với tác giả, mở lại Explore | Thấy thêm bài nhãn `Connections`; tổng dữ liệu seed hiện tại là 3 bài |  |
| W3-04 | User mở bài Public, nhập một comment bình thường rồi bấm Đăng | Comment xuất hiện ngay; counter tăng 1; reload vẫn còn vì đã lưu DB |  |
| W3-05 | User gửi comment chứa từ `scam` | Comment có nhãn `Đang chờ kiểm duyệt`; có cảnh báo; Guest khác không thấy comment đó |  |
| W3-06 | User bấm `Báo cáo`, nhập lý do từ 3 ký tự trở lên | Hiện thông báo BeeBuddy đã nhận báo cáo; DB có report `PENDING` |  |
| W3-07 | Mở DevTools Network, reload Explore | Request `/api/posts` trả 200; dữ liệu bài viết không còn lấy từ mảng hard-code ở frontend |  |
| W3-08 | Tắt backend rồi reload Explore | Hiện trạng thái lỗi và nút `Thử lại`, trang không crash |  |

**Lệnh kiểm tra tự động W3**

```powershell
cd E:\Project\BeeBuddy\web\backend
npm.cmd test
npm.cmd run build

cd E:\Project\BeeBuddy\web
npm.cmd run build
```

Kết quả tại thời điểm bàn giao W3: backend `6` test files / `17` tests PASS; backend TypeScript build PASS; Next.js production build PASS.

### Đợt 3 — Kết nối và tìm kiếm

**Công việc**

- Chuẩn hóa trạng thái connection: PENDING/ACCEPTED/REJECTED/BLOCKED.
- API gửi/hủy/chấp nhận/từ chối kết nối và danh sách connections.
- Privacy profile PUBLIC/CONNECTIONS/ONLY_ME được enforce tại API.
- Web tiếp tục preview che tên; mobile có kết quả đầy đủ theo quyền.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R3-01 | A gửi request tới B | B thấy request pending; chưa xem được nội dung connections-only |
| R3-02 | B accept | Cả A/B thấy nhau; feed connections-only mở đúng |
| R3-03 | B reject hoặc A unfriend | Quan hệ bị đóng ở cả hai phía |
| R3-04 | Guest tìm `Coding` trên web | Có tổng số và tối đa 3 preview đã che tên |
| R3-05 | Đặt profile ONLY_ME rồi truy cập từ user khác | API không trả dữ liệu riêng tư |

### W4 Web-first — Search preview, bảng giá và legal signup (đã triển khai 23/09/2026)

| ID | Cách tự test | Kết quả mong đợi | PASS/FAIL |
|---|---|---|---|
| W4-01 | Mở `/community`, nhập `Coding` | Hiện tổng số thật, tối đa 3 hồ sơ che tên; dữ liệu seed hiện có `Hoàng P***` |  |
| W4-02 | Bấm chip `Chạy bộ`, `Đọc sách`, `Cà phê` | Kết quả thay đổi theo interests/habits/bio trong PostgreSQL, không phân biệt hoa/thường |  |
| W4-03 | Kiểm tra thẻ kết quả | Không có nút Connect; chỉ có CTA tiếp tục trên ứng dụng |  |
| W4-04 | Mở `/billing` khi chưa đăng nhập | Có đúng 3 gói FREE/VIP/PRO, giá `Miễn phí`, `49.000 ₫`, `99.000 ₫` từ API |  |
| W4-05 | Tắt backend rồi reload `/billing` | Hiện lỗi và nút thử lại, không hiển thị giá hard-code |  |
| W4-06 | Mở `/signup`, không tick Terms/Privacy rồi đăng ký | Frontend chặn và backend cũng trả 400 nếu gọi trực tiếp |  |
| W4-07 | Tick cả hai và tạo tài khoản mới | Đăng ký thành công; DB có hai consent `TERMS` và `PRIVACY` gắn với user |  |

Kết quả tự động khi bàn giao: Web build PASS; backend build PASS; `7` test files / `20` tests PASS; mobile typecheck và lint PASS.

### Đợt 4 — Community cơ bản

**Công việc**

- Thêm Community, CommunityMember và role OWNER/MODERATOR/MEMBER.
- Tạo/join/leave/list/detail community; feed community cơ bản.
- Enforce hạn mức theo tier tại backend, không chỉ disable nút UI.
- Tạm hoãn invite nâng cao, event và group voice/video.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R4-01 | FREE/VIP/PRO tạo community theo giới hạn đã chốt | API cho phép/từ chối đúng tier |
| R4-02 | Join rồi leave community | Member count và membership cập nhật đúng |
| R4-03 | Member thường sửa/xóa community | API trả 403 |
| R4-04 | Owner xóa member | Member mất quyền xem nội dung private |
| R4-05 | Nâng tier trên web rồi mở lại app | Quyền tạo community cập nhật sau refresh user |

### Đợt 5 — Chat chữ 1-1 realtime

**Công việc**

- Thêm Conversation, ConversationMember, Message và MessageRead.
- Chỉ connection được mở chat 1-1; phân trang lịch sử.
- Dùng WebSocket/Socket.IO trên backend deploy hỗ trợ kết nối lâu dài.
- Tin nhắn TEXT trước; ảnh/voice/group chat là P1/P2.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R5-01 | A nhắn B khi cả hai online | B nhận gần realtime, không cần refresh |
| R5-02 | B offline, A gửi; B mở app | Tin nhắn được lưu và tải lại đúng thứ tự |
| R5-03 | User C thử gọi API conversation của A/B | API trả 403/404, không lộ message |
| R5-04 | Tắt mạng rồi bật lại | App reconnect, không nhân đôi message |
| R5-05 | Mở conversation | Unread count về 0, read timestamp cập nhật |

### Đợt 6 — Admin và moderation thật

**Công việc**

- Thay toàn bộ số liệu hard-code trong `app/admin` bằng API.
- Quản lý user/ban/tier/payment/report/badword có loading/error/empty state.
- Audit log mọi thao tác nhạy cảm.
- Không cho admin tự khóa mình hoặc sửa admin khác nếu chưa có Super Admin.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R6-01 | So sánh metrics admin với dữ liệu seed/DB | Số user, tier, payment, report khớp |
| R6-02 | Ban user rồi thử login/refresh/API | User bị từ chối nhất quán |
| R6-03 | Approve/HIDE comment flagged | Feed và hàng đợi moderation cập nhật đúng |
| R6-04 | Thêm/xóa badword rồi comment lại | Filter dùng danh sách mới ngay hoặc sau cache TTL đã ghi rõ |
| R6-05 | Xem audit log trong DB | Có adminId, action, target và timestamp chính xác |

### Đợt 7 — PayOS và đồng bộ tier

**Công việc**

- Thay VietQR minh họa bằng API PayOS chính thức.
- Xác thực webhook signature, orderCode, amount, currency và trạng thái.
- Idempotency: webhook gửi lặp không cộng thêm hạn gói.
- Không dùng `userId` làm `adminId` trong payment audit; tách system actor/audit phù hợp.
- Web billing hiển thị PENDING/COMPLETED/FAILED và lịch sử thật.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R7-01 | User tạo checkout VIP sandbox | DB có đúng một Payment PENDING và QR/link hợp lệ |
| R7-02 | Gửi webhook sai signature/sai amount | HTTP từ chối; payment/tier không đổi |
| R7-03 | Thanh toán sandbox thành công | Payment COMPLETED; tier và expiry cập nhật |
| R7-04 | Gửi lại cùng webhook 2–3 lần | Expiry chỉ tăng một lần |
| R7-05 | Mở web và app sau thanh toán | Hai nơi cùng hiện tier mới |

### Đợt 8 — Deploy

**Công việc**

- PostgreSQL managed, storage, backend HTTPS và Next.js web.
- Chạy `prisma migrate deploy`, không chạy `db push` trên production.
- CORS allowlist web production và mobile; rate limit/auth hardening.
- Logging không chứa password/token; health và readiness; backup/restore rehearsal.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R8-01 | Mở `/health` API production | HTTP 200 qua HTTPS |
| R8-02 | Register/login từ web production và app staging | Cả hai dùng cùng DB production/staging đã chỉ định |
| R8-03 | Gọi API từ origin không được phép | Bị CORS từ chối |
| R8-04 | Restart/redeploy backend | Dữ liệu không mất, migration không lỗi |
| R8-05 | Thực hiện restore bản backup thử nghiệm | Khôi phục được dữ liệu và ghi lại thời gian phục hồi |

### Đợt 9–10 — APK, UAT và release

**Công việc**

- Đặt `EXPO_PUBLIC_API_URL` là backend HTTPS production/staging khi build.
- Build profile APK, cài thử trên ít nhất Android 10 và một máy Android mới hơn.
- Test mạng Wi-Fi/4G, đóng/mở app, token expiry và upload ảnh.
- Fix blocker; tạo release notes, checksum và rollback guide.

| ID | Cách tự test | Kết quả mong đợi |
|---|---|---|
| R9-01 | Tải và cài APK khi chưa có app | Cài thành công, tên/icon BeeBuddy đúng |
| R9-02 | Cài APK mới đè bản cũ | Nâng cấp thành công, session/dữ liệu hợp lệ được giữ |
| R9-03 | Test register → profile → connect → post → comment → chat | Luồng end-to-end hoàn thành không crash |
| R9-04 | Chuyển Wi-Fi ↔ 4G, force close rồi mở lại | App phục hồi phiên và báo lỗi mạng rõ ràng |
| R9-05 | Đăng nhập user bị ban | Bị từ chối; không truy cập dữ liệu cache riêng tư |
| R10-01 | Cài APK final từ link bàn giao | Checksum khớp, app gọi đúng production API |

## 6. Quy trình bàn giao sau mỗi lần Codex làm việc

Sau mỗi đợt hoặc lát cắt, phản hồi bàn giao phải luôn có bảng sau:

| Mục | Nội dung bắt buộc |
|---|---|
| Đã làm | Danh sách chức năng thực sự hoàn thành, không ghi tính năng mới chỉ có UI |
| File thay đổi | Link tới các file chính |
| Tự động kiểm tra | Lệnh đã chạy và kết quả PASS/FAIL |
| Chuẩn bị test | Server, DB, `.env`, tài khoản hoặc thiết bị cần có |
| Bảng test thủ công | ID, thao tác từng bước, kết quả mong đợi, ô PASS/FAIL |
| Chưa làm/rủi ro | Phần còn giả lập, phụ thuộc dịch vụ ngoài hoặc cần quyết định |
| Điểm dừng | Yêu cầu người dùng xác nhận test trước khi chuyển sang đợt kế tiếp |

### Mẫu bảng người dùng phản hồi

| Test ID | Thiết bị/trình duyệt | Kết quả thực tế | PASS/FAIL | Ảnh/lỗi nếu có |
|---|---|---|---|---|
| R?-01 |  |  |  |  |
| R?-02 |  |  |  |  |
| R?-03 |  |  |  |  |

Khi báo lỗi, gửi: Test ID, ảnh chụp, thông báo lỗi, terminal liên quan và bước cuối cùng trước khi lỗi xảy ra. Không gửi password thật, JWT, `DATABASE_URL` hoặc khóa PayOS.

## 7. Lệnh nền dùng để tự kiểm tra

Chạy trong PowerShell, mỗi dịch vụ một terminal.

### Backend

```powershell
cd E:\Project\BeeBuddy\web\backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd run dev
```

Các đợt sau sẽ bổ sung script test. Database local cần `backend/.env`; không commit file này.

### Web

```powershell
cd E:\Project\BeeBuddy\web
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

Mở `http://localhost:3000`.

### Mobile

```powershell
cd E:\Project\BeeBuddy\web\mobile
npm.cmd install
npm.cmd run typecheck
npm.cmd run lint
npm.cmd start
```

- Android emulator dùng `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000`.
- Điện thoại thật cùng Wi-Fi dùng IPv4 LAN của máy tính, không dùng `localhost`.
- APK phát cho người khác phải dùng backend HTTPS công khai.

## 8. Điều kiện chấp nhận release 1.0

Release chỉ được ký hoàn tất khi:

- Không còn dữ liệu demo/hard-code ở auth, account, feed, admin, billing.
- P0 automated tests và toàn bộ UAT critical PASS.
- Không có secret thật trong Git, APK hoặc biến `EXPO_PUBLIC_*`.
- Webhook payment giả và truy cập admin trái phép đều bị chặn.
- Migration production và rollback đã thử trên staging.
- Web/API production có HTTPS; APK chỉ gọi URL production.
- Có người chịu trách nhiệm backup DB, PayOS webhook, log và xử lý sự cố.
- Các tính năng P1/P2 chưa làm được ẩn rõ, không để nút bấm giả gây hiểu nhầm.

## 9. Điểm bắt đầu đề xuất

Lần triển khai tiếp theo bắt đầu từ **Đợt 0**, không bắt đầu từ chat hoặc Figma pixel-perfect. Kết quả cần giao đầu tiên là: migration baseline, env validation, automated auth tests và một quy trình local có thể chạy lại. Sau khi người dùng hoàn thành bảng R0-01 đến R0-05 và xác nhận PASS, chuyển sang Đợt 1 để nối auth/account web với backend thật.
