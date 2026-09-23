# BeeBuddy

BeeBuddy gồm ba phần:

- **Web**: Next.js, chạy mặc định tại `http://localhost:3000`.
- **Backend API**: Express + Prisma, chạy mặc định tại `http://localhost:5000`.
- **Mobile**: Expo/React Native, chạy bằng Android Emulator hoặc Expo Go.

Web và mobile không kết nối trực tiếp tới PostgreSQL. Cả hai gọi chung Backend API, sau đó backend đọc/ghi dữ liệu trong cùng một cơ sở dữ liệu PostgreSQL.

## 1. Phần mềm cần cài

Trước khi clone dự án, hãy cài:

- [Git](https://git-scm.com/downloads)
- [Node.js LTS](https://nodejs.org/) (khuyến nghị Node.js 22)
- [PostgreSQL](https://www.postgresql.org/download/windows/) (khuyến nghị PostgreSQL 15 trở lên)
- Để chạy app Android, chọn một trong hai:
  - Android Studio và Android Emulator; hoặc
  - Điện thoại Android có ứng dụng Expo Go, kết nối cùng Wi-Fi với máy tính.

Kiểm tra Git, Node.js và npm trong PowerShell:

```powershell
git --version
node --version
npm.cmd --version
```

> Stack Builder đi kèm PostgreSQL không bắt buộc đối với dự án này và có thể đóng lại.

## 2. Clone dự án

Mở PowerShell tại thư mục muốn chứa dự án rồi chạy:

```powershell
cd E:\Project\BeeBuddy
git clone https://github.com/whopqa/beebuddy.git web
cd web
```

Nếu cần chạy bản chưa được merge đang nằm trên nhánh `demo-feature`, clone trực tiếp nhánh đó:

```powershell
cd E:\Project\BeeBuddy
git clone --branch demo-feature https://github.com/whopqa/beebuddy.git web
cd web
```

Sau khi clone, mọi lệnh Git phải được chạy trong thư mục `web`. Nếu chạy ở `E:\Project\BeeBuddy`, Git sẽ báo `not a git repository`.

## 3. Cài thư viện

Chạy lần lượt:

```powershell
cd E:\Project\BeeBuddy\web
npm.cmd install

cd backend
npm.cmd install

cd ..\mobile
npm.cmd install
```

## 4. Tạo các file môi trường

Từ thư mục `E:\Project\BeeBuddy\web`, chạy:

```powershell
Copy-Item .env.example .env.local
Copy-Item backend\.env.example backend\.env
Copy-Item mobile\.env.example mobile\.env.local
```

Các file `.env.local` và `.env` chứa cấu hình riêng của từng máy, không được commit lên Git.

### Cấu hình web

Mở `.env.local` và giữ:

```env
BACKEND_API_URL=http://localhost:5000
```

### Cấu hình backend và PostgreSQL

Mở `backend/.env`, sau đó sửa `DATABASE_URL` theo mật khẩu PostgreSQL trên máy:

```env
DATABASE_URL="postgresql://postgres:MAT_KHAU@localhost:5432/beebuddy?schema=public"
```

Nếu mật khẩu chứa ký tự đặc biệt, phải URL-encode ký tự đó. Ví dụ:

- `@` thành `%40`
- `#` thành `%23`
- `%` thành `%25`

Ví dụ mật khẩu là `abc@`:

```env
DATABASE_URL="postgresql://postgres:abc%40@localhost:5432/beebuddy?schema=public"
```

Không dùng các giá trị JWT mặc định của file mẫu khi triển khai production.

### Cấu hình mobile

Mở `mobile/.env.local` và chọn đúng địa chỉ backend:

Android Emulator mặc định của Android Studio:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

Điện thoại thật dùng Expo Go:

1. Cho điện thoại và máy tính kết nối cùng một mạng Wi-Fi.
2. Chạy `ipconfig` và tìm địa chỉ **IPv4 Address** của Wi-Fi, ví dụ `192.168.1.20`.
3. Cấu hình:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000
```

Không dùng `localhost` trong app Android vì khi đó `localhost` là chính thiết bị/emulator, không phải máy tính đang chạy backend.

## 5. Tạo cơ sở dữ liệu và dữ liệu mẫu

Đảm bảo dịch vụ PostgreSQL đang chạy. Tạo database bằng pgAdmin:

1. Mở pgAdmin.
2. Mở `Servers` > PostgreSQL > `Databases`.
3. Nhấp chuột phải `Databases` > `Create` > `Database`.
4. Đặt tên database là `beebuddy` rồi lưu.

Hoặc dùng `psql` nếu lệnh này đã có trong PATH:

```powershell
psql -U postgres -c "CREATE DATABASE beebuddy;"
```

Sau đó áp dụng schema và tạo dữ liệu mẫu:

```powershell
cd E:\Project\BeeBuddy\web\backend
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run prisma:seed
```

Nếu database `beebuddy` đã tồn tại thì không cần tạo lại. Tài khoản thử được tạo bởi seed:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| User | `minh.nguyen@beebuddy.vn` | `user123456` |
| Admin | `admin@beebuddy.vn` | `admin123456` |

Các tài khoản trên chỉ dùng cho môi trường phát triển cục bộ.

## 6. Chạy dự án

Cần mở ba cửa sổ PowerShell riêng và giữ cả ba cửa sổ đang chạy.

### Cửa sổ 1: Backend API

```powershell
cd E:\Project\BeeBuddy\web\backend
npm.cmd run dev
```

Kiểm tra backend tại [http://localhost:5000/health](http://localhost:5000/health).

### Cửa sổ 2: Web

```powershell
cd E:\Project\BeeBuddy\web
npm.cmd run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Cửa sổ 3: Mobile Expo

```powershell
cd E:\Project\BeeBuddy\web\mobile
npm.cmd start -- --clear
```

- Android Emulator: mở một máy ảo trong Android Studio trước, sau đó nhấn `a` tại cửa sổ Expo.
- Điện thoại thật: mở Expo Go và quét QR code do Expo hiển thị.
- Sau khi đổi `EXPO_PUBLIC_API_URL`, dừng Expo bằng `Ctrl+C` rồi chạy lại lệnh trên.

Khi Windows Firewall hỏi quyền truy cập cho Node.js, cho phép trên mạng riêng để điện thoại có thể gọi backend.

## 7. Kiểm tra trước khi gửi code

Chạy các lệnh sau trong từng thư mục:

```powershell
cd E:\Project\BeeBuddy\web\backend
npm.cmd test
npm.cmd run build

cd E:\Project\BeeBuddy\web
npm.cmd run build

cd E:\Project\BeeBuddy\web\mobile
npm.cmd run typecheck
npm.cmd run lint
```

## 8. Lỗi thường gặp

### `fatal: not a git repository`

Bạn đang đứng ngoài repository. Chạy:

```powershell
cd E:\Project\BeeBuddy\web
git status
```

### Web báo `ERR_CONNECTION_REFUSED` tại cổng 3000

Frontend chưa chạy. Vào thư mục `web` và chạy `npm.cmd run dev`.

### Web hoặc app không tải được dữ liệu

- Kiểm tra backend vẫn đang chạy ở cổng 5000.
- Mở `http://localhost:5000/health` trên máy tính.
- Với emulator, kiểm tra API URL là `http://10.0.2.2:5000`.
- Với điện thoại thật, kiểm tra IP Wi-Fi của máy tính và quyền Windows Firewall.

### Prisma báo `P1000` hoặc `P1001`

- Kiểm tra dịch vụ PostgreSQL đang chạy.
- Kiểm tra tên database, tài khoản và mật khẩu trong `backend/.env`.
- URL-encode các ký tự đặc biệt trong mật khẩu.

### PowerShell chặn `npm.ps1`

Dùng `npm.cmd` như các lệnh trong tài liệu này thay cho `npm`.

### Cổng 3000 hoặc 5000 đang được sử dụng

Tìm cửa sổ terminal đã chạy dự án trước đó và nhấn `Ctrl+C`, sau đó chạy lại dịch vụ.

## 9. Cấu trúc chính

```text
web/
├── src/               # Giao diện web Next.js
├── backend/           # Express API, Prisma và PostgreSQL
├── mobile/            # Ứng dụng Expo/React Native
├── doc/               # Tài liệu hệ thống
├── .env.example       # Mẫu cấu hình web
└── README.md           # Hướng dẫn này
```
