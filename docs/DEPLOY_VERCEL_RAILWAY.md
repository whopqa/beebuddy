# Deploy BeeBuddy: Vercel (web) + Railway (API, PostgreSQL, media)

Hướng dẫn này áp dụng cho repo `whopqa/beebuddy`, trong đó **gốc Git là thư mục web** và backend nằm trong `backend/`. Không đưa `.env`, mật khẩu, JWT, SMTP, PayOS hoặc `DATABASE_URL` vào Git hay ảnh chụp màn hình.

## 0. Trước khi bắt đầu

- Cần tài khoản GitHub, Vercel và Railway. Phương án **PostgreSQL + backend có volume trong cùng Railway project cần hai volume**: gói Free hiện chỉ cho một volume/project; dùng Trial còn hạn mức hoặc Hobby (từ 5 USD/tháng, có thể phát sinh thêm theo sử dụng). Nếu muốn chỉ dùng Free, phải đặt PostgreSQL ở nhà cung cấp khác và giữ một volume Railway cho ảnh; dịch vụ lâu dài có thể vượt mức credit Free.
- Cần Google OAuth Web Client ID, dịch vụ gửi email (Resend API trên Railway Trial/Free/Hobby, hoặc SMTP trên Railway Pro) và ba khóa PayOS thật để backend khởi động với `NODE_ENV=production`.
- Kiểm tra lại các file bạn đã sửa, đặc biệt migration mới, rồi commit/push **nhánh đang muốn deploy**. Không chạy `prisma:seed` trên production: seed demo tạo `admin@beebuddy.vn` với mật khẩu công khai.

Từ PowerShell tại `E:\Project\BeeBuddy\web`:

```powershell
git status
npm.cmd ci
npm.cmd run build
cd backend
npm.cmd ci
npm.cmd run build
npm.cmd test
cd ..
```

Sau khi kiểm tra `git status` và chắc chắn mọi thay đổi cần thiết đều thuộc lần deploy này:

```powershell
git add -A
git commit -m "Prepare BeeBuddy for Vercel and Railway"
git push -u origin integrate-main-ui
```

Nếu bạn đang ở nhánh khác, thay `integrate-main-ui` bằng tên nhánh từ `git branch --show-current`. `.env` đã được `.gitignore` loại trừ, nhưng vẫn phải xem lại `git status` trước khi commit.

## 1. Tạo URL web ổn định trên Vercel

1. Mở [Vercel New Project](https://vercel.com/new), kết nối GitHub và import `whopqa/beebuddy`.
2. Chọn **Next.js**, **Root Directory `./`** (không chọn `web`; Git root đã là thư mục web). Giữ Build/Output mặc định.
3. Trong **Environment Variables**, nhập `NEXT_PUBLIC_GOOGLE_CLIENT_ID` bằng Google Web Client ID của bạn. Chưa có backend thì tạm **không** nhập `BACKEND_API_URL`; giao diện có thể deploy trước nhưng API chưa hoạt động.
4. Deploy và ghi lại URL dạng `https://ten-project.vercel.app`.
5. Nếu muốn deploy nhánh `integrate-main-ui` lên URL production thay vì `main`, vào **Project Settings → Environments → Production → Branch Tracking**, chọn `integrate-main-ui`, Save, rồi tạo deployment mới từ nhánh này. Nếu không, nhánh này chỉ là Preview; URL Preview thay đổi theo deployment.

## 2. Tạo PostgreSQL và backend trên Railway

1. Kiểm tra plan Railway đủ ít nhất hai volume. Tạo một Railway project, thêm **PostgreSQL**. Đặt tên service là `Postgres` để dùng đúng ví dụ reference variable bên dưới.
2. Thêm service từ GitHub repo `whopqa/beebuddy`, chọn cùng nhánh đã deploy web. Trong service **Settings → Source**, đặt **Root Directory `/backend`**. Railway sẽ dùng `backend/Dockerfile` để cài thư viện, generate Prisma Client và build TypeScript.
3. Trong **Settings → Deploy**, đặt **Pre-Deploy Command** thành `npm run prisma:deploy`. Đây là migration production; không dùng `prisma migrate dev`, `db push` hoặc `prisma:seed`.
4. Đặt **Healthcheck Path** là `/health`. Giữ backend ở **một replica** vì realtime hiện dùng event bus trong bộ nhớ của tiến trình và ảnh dùng volume cục bộ. Không bật Serverless/App Sleeping nếu cần chat realtime ổn định.
5. Gắn **Volume** vào backend với **Mount Path `/data`**. Đặt `MEDIA_UPLOAD_DIR=/data/uploads`. Không gắn volume lên `/app` vì sẽ che code trong image.
6. Trong **Settings → Networking**, chọn **Generate Domain** để lấy URL HTTPS của backend. Giữ PostgreSQL private; backend dùng reference variable trong cùng Railway project.

Trong **Variables** của backend, điền các giá trị sau (không dán giá trị mẫu):

```text
NODE_ENV=production
CLIENT_URL=https://ten-project.vercel.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<chuoi-ngau-nhien-rieng-it-nhat-32-ky-tu>
JWT_REFRESH_SECRET=<chuoi-ngau-nhien-khac-it-nhat-32-ky-tu>
PUSH_TOKEN_ENCRYPTION_KEY=<chuoi-ngau-nhien-thu-ba-it-nhat-32-ky-tu>
EMAIL_DELIVERY_MODE=resend
EMAIL_FROM=BeeBuddy <onboarding@resend.dev>
RESEND_API_KEY=<api-key-lay-trong-Resend>
GOOGLE_CLIENT_ID=<cung-Google-Web-Client-ID-ben-Vercel>
MEDIA_UPLOAD_DIR=/data/uploads
MEDIA_IMAGE_MAX_BYTES=4194304
PAYOS_CLIENT_ID=<client-id-that>
PAYOS_API_KEY=<api-key-that>
PAYOS_CHECKSUM_KEY=<checksum-key-that>
PAYOS_RETURN_URL=https://ten-project.vercel.app/billing?status=success
PAYOS_CANCEL_URL=https://ten-project.vercel.app/billing?status=cancelled
```

Ba khóa JWT/push phải khác nhau; có thể tạo riêng từng khóa bằng lệnh dưới đây trên máy bạn và **không gửi kết quả vào chat**:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Không cần tự đặt `PORT` nếu Railway đã cấp biến này. Nếu dịch vụ PostgreSQL không tên `Postgres`, đổi phần `Postgres` trong reference variable thành tên service thực tế.

Railway Trial/Free/Hobby **chặn SMTP**, nên `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` không giúp gửi email trên các gói này. Tạo tài khoản Resend và API key, nhập key **chỉ vào Railway Variables**, không gửi qua chat hoặc commit vào Git. Sender thử nghiệm `onboarding@resend.dev` chỉ phù hợp để gửi thử đến email của chính tài khoản Resend; trước khi cho người dùng khác đăng ký, cần [xác minh domain bạn sở hữu trên Resend](https://resend.com/docs/dashboard/domains/introduction) rồi đổi `EMAIL_FROM` thành địa chỉ ở domain đó (ví dụ `BeeBuddy <no-reply@your-domain.example>`). Domain `*.vercel.app` không phải domain bạn sở hữu để cấu hình DNS. Nếu dùng Railway Pro và muốn giữ SMTP, đặt `EMAIL_DELIVERY_MODE=smtp` cùng `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` hợp lệ.

### Chế độ demo tạm thời khi chưa gửi được email

Chỉ dùng cho buổi demo và chỉ sau khi đã deploy mã nguồn có hỗ trợ chế độ này. Trong **Railway → backend service → Variables**, thêm `DEMO_SKIP_EMAIL_VERIFICATION_UNTIL=2026-10-03T00:00:00+07:00` (thay bằng thời điểm kết thúc demo của bạn; tối đa 7 ngày từ lúc deploy). Redeploy backend. Đăng ký trên web sẽ không gửi email xác minh và tự đăng nhập bằng mật khẩu; tài khoản đã tạo nhưng chưa xác minh cũng đăng nhập được. Điều khoản sử dụng, chính sách quyền riêng tư, mật khẩu và kiểm tra tài khoản bị khóa vẫn giữ nguyên. Biến này không cần đặt trên Vercel.

**Rủi ro:** mọi người có thể đăng ký bằng email họ không sở hữu trong thời gian demo. Tài khoản vẫn được lưu là *chưa xác minh*, không bị tự đánh dấu đã xác minh. Sau demo, **xóa biến trên Railway rồi redeploy**; đăng nhập mới và làm mới phiên của các tài khoản này sẽ yêu cầu xác minh email trở lại. Access token đã cấp có thể còn hiệu lực đến khi hết hạn; nếu cần chặn ngay, phải thu hồi phiên. Chức năng quên mật khẩu vẫn cần dịch vụ email hoạt động.

Sau khi Railway deploy thành công, mở `https://<backend-domain>/health`; phải thấy JSON có `status: "ok"`. Healthcheck chỉ xác nhận server đã mở, không thay cho kiểm tra database hoặc email.

## 3. Nối web với backend và các dịch vụ ngoài

1. Ở **Vercel → Project → Settings → Environment Variables**, thêm `BACKEND_API_URL=https://<backend-domain>` (không thêm `/api/v1`, không có dấu `/` cuối). Chọn đúng environment **Production**; nếu đang dùng Preview thì chọn **Preview** nữa.
2. **Redeploy** web. Biến mới không được áp dụng cho deployment cũ.
3. Trong Google Cloud OAuth Web Client, thêm `https://ten-project.vercel.app` vào **Authorized JavaScript origins**. Không thêm đường dẫn; cùng client ID phải có ở web và backend.
4. Trong PayOS, đặt webhook URL `https://ten-project.vercel.app/api/payments/webhook`. Return/cancel URL đã đặt ở backend. Thanh toán PayOS là tiền thật, chỉ thử với giao dịch nhỏ bạn chấp nhận được.
5. Kiểm tra email verification và password reset bằng email thật. Nếu tài khoản đã tạo trước khi SMTP lỗi, dùng **Gửi lại mã xác minh**, không đăng ký lại. Link trong thư phải trỏ về URL Vercel, không phải localhost.

## 4. Tạo admin production an toàn

Đăng ký tài khoản bằng email của bạn và xác minh email thành công. Sau đó cài Railway CLI, đăng nhập và mở shell trong **backend service**. Chạy lệnh bên trong container:

```text
node scripts/grant-admin.mjs email-da-xac-minh-cua-ban@example.com
```

Có thể dùng `railway ssh --service <ten-backend-service> -- node scripts/grant-admin.mjs email@example.com` sau khi liên kết project CLI. Mặc định, script chỉ nâng quyền tài khoản đã tồn tại, đã xác minh, không bị khóa; đồng thời ghi audit log. Đăng xuất và đăng nhập lại để nhận JWT có role mới. Không chạy seed demo để lấy admin.

Nếu Google và email verification chưa dùng được trong buổi demo: đăng ký tài khoản của **chính bạn** trước, rồi khi `DEMO_SKIP_EMAIL_VERIFICATION_UNTIL` vẫn còn hiệu lực, mở shell trong backend service Railway và chạy `node scripts/grant-admin.mjs email-cua-ban@example.com --demo-unverified`. Chỉ email được nêu trong lệnh được nâng quyền; script không tự xác minh email, không cấp quyền qua web và ghi ngoại lệ demo vào audit log. Kiểm tra email thật kỹ trước khi chạy; sau demo nên xác minh email của admin hoặc thu hồi quyền admin này. Không nhập email/mật khẩu của người khác và không chạy seed demo.

## 5. Kiểm thử sau deploy

1. `GET /health` trên backend trả `status: ok`.
2. Đăng ký → nhận email → xác minh → đăng nhập; thử Google login và reset password.
3. Sửa profile và upload ảnh đại diện; tạo bài viết có ảnh, like/report; thử cộng đồng và Connect với hai tài khoản thật.
4. Chat giữa hai trình duyệt/tài khoản; gửi ảnh dưới 4 MB, xác nhận trạng thái “Đã xem”. Để tab mở hơn 5 phút và xác nhận EventSource tự nối lại.
5. Đăng nhập admin đã cấp quyền, mở `/admin` và kiểm tra moderation/audit.
6. Chỉ khi sẵn sàng giao dịch tiền thật mới thử thanh toán PayOS và kiểm tra webhook/cập nhật subscription.

## Giới hạn cần biết

- Ảnh được giới hạn **4 MiB** để request/response đi qua Vercel Function không chạm mức 4,5 MB. Nếu muốn giữ 5 MB hoặc tăng hơn, cần đổi luồng upload sang direct upload/object storage.
- Với volume và event bus trong bộ nhớ, backend phải có **một replica**. Railway có thể ngắt kết nối ngắn khi redeploy service gắn volume; trình duyệt sẽ nối lại chat nhưng không thể hứa zero-downtime.
- Media trên Railway volume là bền qua redeploy, nhưng vẫn cần chính sách sao lưu riêng. Nếu mở rộng nhiều replica hoặc lưu dài hạn, chuyển sang object storage và Redis pub/sub.

Tài liệu chính thức: [Vercel Git deployments](https://vercel.com/docs/git), [Vercel Function limits](https://vercel.com/docs/functions/limitations), [Railway monorepo](https://docs.railway.com/deployments/monorepo), [Railway PostgreSQL](https://docs.railway.com/databases/postgresql), [Railway volume limits](https://docs.railway.com/volumes/reference), [Railway pricing](https://docs.railway.com/pricing/plans), [Railway outbound networking](https://docs.railway.com/networking/outbound-networking), [Railway pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), [Prisma migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy).
