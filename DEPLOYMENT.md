
# Hướng Dẫn Triển Khai Chi Tiết: Bookfeel

Chào mừng bạn! Tài liệu này sẽ hướng dẫn bạn từng bước để triển khai ứng dụng Bookfeel lên môi trường internet. Hướng dẫn được viết cho người mới bắt đầu, không yêu cầu kinh nghiệm lập trình sâu, chỉ cần bạn cẩn thận làm theo.

## Giới Thiệu Mô Hình Hoạt Động

Để ứng dụng của chúng ta có thể chạy trên mạng, nó được chia làm 2 phần chính, và chúng ta sẽ đặt chúng ở 2 nơi khác nhau:

1.  **Phần Backend (Lưu trữ dữ liệu) - Đặt trên Cloudflare:**
    *   **Giải thích:** Backend giống như "nhà kho" của ứng dụng. Nó không có giao diện đẹp mắt, nhiệm vụ chính là lưu trữ và quản lý tất cả dữ liệu.
    *   **Cloudflare R2:** Nơi lưu trữ các file hình ảnh bạn tải lên (bìa sách, ảnh truyền cảm hứng).
    *   **Cloudflare KV:** Nơi lưu trữ dữ liệu dạng chữ (tên sách, cảm nghĩ, tóm tắt...).
    *   **Cloudflare Worker:** Một "người trung gian" thông minh, nhận yêu cầu từ người dùng (ví dụ: "lấy cho tôi cảm nghĩ về cuốn sách X") và đi vào "nhà kho" (R2 và KV) để lấy đúng dữ liệu rồi gửi lại.

2.  **Phần Frontend (Giao diện người dùng) & Máy chủ Proxy - Đặt trên VPS của bạn:**
    *   **Giải thích:** Frontend chính là trang web mà bạn nhìn thấy và tương tác (các nút bấm, ô nhập liệu, hình ảnh hiển thị).
    *   **React App:** Giao diện người dùng được xây dựng bằng công nghệ React.
    *   **Máy chủ Proxy:** Một máy chủ nhỏ chạy trên VPS có 2 nhiệm vụ:
        1.  Hiển thị trang web (React App) cho người dùng truy cập.
        2.  Làm "người đại diện" để gửi yêu cầu tới AI (ChatGPT), giúp giấu đi API key bí mật của bạn và vượt qua các giới hạn khu vực.

**Quy trình:** Chúng ta phải cài đặt phần Backend trên Cloudflare trước, vì Frontend cần biết địa chỉ của Backend để giao tiếp.

---

### **Phần 1: Lấy Chìa Khóa AI (OpenAI API Key)**

**Tại sao cần bước này?** Ứng dụng có tính năng "AI Assist" giúp bạn trau chuốt lại những dòng cảm nghĩ của mình. Để dùng được tính năng này, chúng ta cần một "chìa khóa" (API Key) để có quyền truy cập vào dịch vụ AI của OpenAI.

1.  Truy cập trang web của OpenAI: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2.  Đăng nhập hoặc tạo tài khoản mới. Bạn có thể cần thêm thông tin thanh toán (thẻ tín dụng). OpenAI sẽ cho một lượng sử dụng miễn phí ban đầu, nhưng sẽ tính phí nếu dùng nhiều.
3.  Sau khi đăng nhập, tìm và nhấn vào nút **"+ Create new secret key"**.
4.  Đặt một cái tên dễ nhớ cho chìa khóa, ví dụ: `Bookfeel Key` rồi nhấn **"Create secret key"**.
5.  **QUAN TRỌNG:** Một chuỗi ký tự bắt đầu bằng `sk-` sẽ hiện ra. **Hãy sao chép (copy) và lưu nó vào một nơi an toàn ngay lập tức** (ví dụ: một file text trên máy tính của bạn). Bạn sẽ không thể xem lại đầy đủ chuỗi ký tự này lần thứ hai. Chúng ta sẽ cần nó ở Phần 3.

---

### **Phần 2: Triển Khai Backend (Trên Cloudflare)**

Phần này sẽ thiết lập "nhà kho" dữ liệu cho ứng dụng của bạn. Các bước dưới đây được thực hiện trên **máy tính cá nhân của bạn**.

#### **Điều kiện cần có**
-   Một tài khoản [Cloudflare](https://dash.cloudflare.com/sign-up) (miễn phí).
-   Đã cài đặt [Node.js](https://nodejs.org/) và `npm` trên **máy tính cá nhân**.
    *   **Giải thích:** Node.js là môi trường để chạy mã JavaScript bên ngoài trình duyệt. `npm` là công cụ quản lý thư viện đi kèm với Node.js, giúp chúng ta cài đặt các công cụ cần thiết.

#### **Bước 1: Cài đặt và Đăng nhập vào Wrangler**
**Giải thích:** Wrangler là một công cụ dòng lệnh (Command-Line Interface - CLI) của Cloudflare. Nó giống như một chiếc "điều khiển từ xa" giúp bạn ra lệnh cho Cloudflare trực tiếp từ máy tính của mình.

Mở Terminal (trên macOS/Linux) hoặc Command Prompt/PowerShell (trên Windows) và gõ các lệnh sau:

```bash
# Lệnh này cài đặt Wrangler vào máy tính của bạn
npm install -g wrangler

# Lệnh này sẽ mở một trang web trong trình duyệt để bạn đăng nhập
wrangler login
```
Sau khi chạy `wrangler login`, trình duyệt sẽ mở ra. Hãy đăng nhập vào tài khoản Cloudflare của bạn và cấp quyền cho Wrangler.

#### **Bước 2: Tạo Kho Chứa Dữ Liệu Chữ (KV Namespace)**
**Giải thích:** KV (Key-Value) là một dạng cơ sở dữ liệu siêu đơn giản. Hãy tưởng tượng nó như một cuốn từ điển, mỗi "từ" (key) tương ứng với một "định nghĩa" (value). Chúng ta sẽ dùng nó để lưu các thông tin dạng chữ như `entry-code-123` (key) và `{ "bookTitle": "Dune", ... }` (value).

1.  Vào trang quản trị Cloudflare, ở menu bên trái, chọn **Workers & Pages** -> **KV**.
2.  Nhấn nút **Create a namespace**.
3.  Đặt tên cho nó là `BOOKFEEL_KV`, sau đó nhấn **Add**.
4.  Sau khi tạo xong, bạn sẽ thấy một danh sách các namespace. Tìm cái bạn vừa tạo và **sao chép (copy) giá trị ID** của nó. Nó là một chuỗi ký tự dài (trong trường hợp này, bạn sẽ sử dụng `4704511fbedd4574bf6172a0229d10a7` như đã yêu cầu).

#### **Bước 3: Tạo và Cấu hình Kho Chứa Hình Ảnh (R2 Bucket)**

**A. Tạo Kho Chứa (Bucket)**
**Giải thích:** R2 là dịch vụ lưu trữ file của Cloudflare, tương tự như Google Drive hay Dropbox. Chúng ta sẽ dùng nó để lưu tất cả bìa sách và ảnh liên quan.

1.  Trong trang quản trị Cloudflare, ở menu bên trái, chọn **R2**.
2.  Nhấn **Create bucket**. Đặt tên cho nó là `book-assets`.
3.  Nhấn **Create bucket**.

**B. Cho Phép Truy Cập Công Khai (RẤT QUAN TRỌNG)**
**Giải thích:** Mặc định, các file trong R2 là riêng tư. Chúng ta cần cho phép truy cập công khai để trình duyệt web của mọi người có thể xem được ảnh.

1.  Vào trang cài đặt của bucket bạn vừa tạo, chọn tab **Settings**.
2.  Tìm mục **Public URL** và nhấn **Allow Access**.
3.  Một cửa sổ sẽ hiện ra. Hãy nhấn vào nút **Allow** màu xanh.
4.  Sau khi bật, hệ thống sẽ cho bạn một đường link công khai. **HÃY SAO CHÉP (COPY) ĐƯỜNG LINK NÀY**. Nó sẽ có dạng `https://pub-xxxxxxxx.r2.dev`.

**C. Tạo Mã Truy Cập cho R2 (API Token)**
**Giải thích:** Chúng ta cần tạo một "chìa khóa riêng" cho "người trung gian" (Worker) để nó có quyền đọc, ghi, xóa file trong kho R2.

1.  Từ trang tổng quan R2, nhìn sang menu bên phải, nhấn vào **Manage R2 API Tokens**.
2.  Nhấn **Create API token**.
3.  Ở phần **Permissions**, chọn **Object Admin Read & Write** (cho phép cả đọc và ghi).
4.  Nhấn **Create API token**.
5.  **⚠️ CẢNH BÁO:** Trang tiếp theo sẽ hiển thị các mã khóa. Hãy **sao chép (copy) và lưu lại cẩn thận 3 giá trị sau**:
    *   `Access Key ID`
    *   `Secret Access Key`
    *   `Account ID` (bạn có thể tìm thấy giá trị này ở trang tổng quan R2, ngay dưới tên tài khoản của bạn).

**D. Thêm Chính Sách CORS**
**Giải thích:** CORS là một cơ chế an ninh của trình duyệt. Bước này giống như việc bạn nói với "kho ảnh R2" rằng: "Này, hãy cho phép các yêu cầu đến từ trang web của tôi (chạy trên VPS) được lấy ảnh nhé!".

1.  Trong tab **Settings** của bucket, cuộn xuống mục **CORS Policy** và nhấn **Add CORS policy**.
2.  Xóa hết nội dung có sẵn và dán đoạn mã JSON này vào:
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
    *   **Lưu ý:** `AllowedOrigins: ["*"]` có nghĩa là cho phép bất kỳ trang web nào cũng có thể yêu cầu ảnh. Điều này tiện cho việc phát triển, nhưng khi ứng dụng đã chạy chính thức, bạn nên thay `"*"` bằng địa chỉ tên miền của bạn (ví dụ: `["https://bookfeel.yourdomain.com"]`) để tăng cường bảo mật.
3.  Nhấn **Save**.

#### **Bước 4: Cấu hình và Triển khai Worker**

<div style="background-color: #ffebe6; border-left: 4px solid #d9534f; padding: 15px; margin: 15px 0;">
  <p style="margin-top: 0; font-weight: bold; color: #d9534f;">QUAN TRỌNG: Cài đặt thư viện cho Worker</p>
  <p style="margin-bottom: 0;">Trên máy tính của bạn, hãy mở Terminal/Command Prompt và điều hướng vào thư mục <code>worker/</code> của dự án, sau đó chạy lệnh <code>npm install</code>.</p>
</div>

```bash
# Trên máy tính cá nhân, di chuyển vào thư mục worker
cd path/to/your/project/worker
npm install
```

**Tiếp theo, hãy chạy các lệnh sau** để lưu trữ an toàn các mã khóa bạn đã lấy ở Bước 3C. Wrangler sẽ hỏi bạn dán (paste) giá trị vào sau mỗi lệnh.
```bash
# Lệnh này để lưu R2 Access Key ID của bạn
wrangler secret put R2_ACCESS_KEY_ID

# Lệnh này để lưu R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY

# Lệnh này để lưu Cloudflare Account ID
wrangler secret put R2_ACCOUNT_ID

# Lệnh này để lưu đường link công khai của R2 bucket (lấy ở Bước 3B)
wrangler secret put R2_PUBLIC_URL
```

**Bây giờ, cấu hình file `wrangler.toml`:**
1.  Mở file `worker/wrangler.toml` bằng một trình soạn thảo văn bản.
2.  **KV Namespace:** Tìm đến dòng `[[kv_namespaces]]`. Dán **ID của KV Namespace** (`4704511fbedd4574bf6172a0229d10a7`) vào phần `id = "..."`.
3.  **R2 Bucket:** Tìm đến dòng `[[r2_buckets]]`. Đảm bảo `bucket_name` là `book-assets`.
4.  **[vars]:** Tìm đến mục `[vars]`. Đảm bảo giá trị `R2_BUCKET_NAME` là `book-assets`.

**Cuối cùng, triển khai Worker:**
```bash
# Đảm bảo bạn vẫn đang ở trong thư mục worker/
wrangler deploy
```
Sau khi chạy xong, Worker của bạn sẽ có tại URL `https://book-api.beetle142.workers.dev`.

**Sau đó, bạn cần cập nhật file `src/config.ts` trong project của mình.**
1.  Mở file `/src/config.ts`.
2.  Thay thế đường link `API_BASE_URL` mặc định bằng đường link worker:
    ```typescript
    export const API_BASE_URL = 'https://book-api.beetle142.workers.dev';
    ```

---

### **Phần 3: Triển Khai Frontend & Máy chủ Proxy (Trên VPS)**

**Giải thích:** VPS (Virtual Private Server) là một chiếc máy tính từ xa mà bạn thuê để chạy trang web 24/7. Phần này sẽ được thực hiện khi bạn đã kết nối vào VPS của mình qua SSH.

#### **Bước 1: Lấy Mã Nguồn Mới Nhất**
```bash
# Kết nối vào VPS của bạn (nếu bạn chưa làm)
# ssh your_username@your_vps_ip_address

# Di chuyển đến thư mục chứa dự án của bạn
cd /var/www/bookfeel

# Tải về phiên bản mã nguồn mới nhất từ GitHub/GitLab
git pull origin main
```

#### **Bước 2: Cài đặt và "Build" Giao diện Người dùng**
**Giải thích:** Lệnh `build` sẽ nén và tối ưu hóa toàn bộ mã nguồn của giao diện (React App) thành các file HTML, CSS, JavaScript tĩnh, sẵn sàng để phục vụ cho người dùng. Kết quả sẽ nằm trong thư mục `dist/`.

```bash
# Đảm bảo bạn đang ở thư mục gốc của dự án
# ví dụ: /var/www/bookfeel

# Cài đặt hoặc cập nhật các thư viện cần thiết cho việc build
npm install

# Chạy quá trình build. Lệnh này sẽ tạo ra thư mục `dist/`.
npm run build
```

#### **Bước 3: Cài đặt Máy chủ Proxy và Thêm Chìa khóa AI**
Bây giờ, chúng ta sẽ làm việc với máy chủ proxy.

```bash
# Di chuyển vào thư mục của máy chủ proxy
cd proxy-server

# Cài đặt các thư viện cho máy chủ proxy
npm install

# Tạo file .env để lưu trữ chìa khóa bí mật
# Bạn có thể dùng nano, một trình soạn thảo văn bản đơn giản trên Linux
nano .env
```
Bên trong file `.env` vừa mở, hãy dán **chìa khóa OpenAI API** bạn đã lưu ở Phần 1. File sẽ chỉ có một dòng duy nhất:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
Lưu lại và thoát: nhấn `Ctrl+X`, sau đó nhấn `Y`, rồi `Enter`.

#### **Bước 4: Khởi động lại Ứng dụng với PM2**
**Giải thích:** PM2 là một công cụ giúp quản lý tiến trình. Nó sẽ giữ cho máy chủ của bạn luôn chạy, tự động khởi động lại nếu bị lỗi, hoặc khi bạn khởi động lại VPS.

```bash
# Đảm bảo bạn vẫn đang ở trong thư mục proxy-server
# ví dụ: /var/www/bookfeel/proxy-server

# Dừng và xóa các phiên bản cũ đang chạy để tránh xung đột
# Lệnh `|| true` đảm bảo không bị lỗi nếu không tìm thấy tiến trình cũ
pm2 stop books-app || true
pm2 delete books-app || true

# Khởi động phiên bản mới của ứng dụng.
# Lệnh này sẽ chạy máy chủ trên cổng 8006
pm2 start npm --name "books-app" -- run start -- --port 8006

# Lưu lại danh sách tiến trình để tự động chạy lại khi VPS khởi động
pm2 save

# Bạn có thể kiểm tra trạng thái và xem log (nhật ký hoạt động) bằng các lệnh sau:
# pm2 status
# pm2 logs books-app
```

#### **Bước 5: Cấu hình Tường lửa và Tự khởi động (Chỉ cần làm lần đầu)**
```bash
# Mở cổng 8006 trên tường lửa để người dùng có thể truy cập
sudo ufw allow 8006/tcp

# Lệnh này sẽ tạo ra một script để PM2 tự khởi động cùng hệ thống
pm2 startup
# (Lệnh startup sẽ hiện ra một lệnh khác, bạn cần sao chép và chạy lệnh đó)
```

**Chúc mừng!** Ứng dụng của bạn đã được triển khai hoàn tất. Tính năng AI Assist bây giờ sẽ hoạt động trơn tru.

---
### **Xử lý sự cố (Troubleshooting)**
-   **Lỗi `EADDRINUSE` trong PM2 Logs:** Lỗi này có nghĩa là cổng (ví dụ: 8006) đã bị một chương trình khác chiếm dụng. Quy trình ở Bước 4 được thiết kế để ngăn chặn điều này. Nếu vẫn xảy ra, hãy tìm và dừng tiến trình đó:
    ```bash
    # Kiểm tra xem tiến trình nào đang dùng cổng 8006
    sudo lsof -i :8006
    # Tìm số trong cột `PID`.
    # Dừng nó bằng PID (thay `12345` bằng PID thực tế):
    sudo kill -9 12345
    # Sau đó thử khởi động lại với `pm2 restart books-app`.
    ```
-   **Tải lên/Xóa ảnh thất bại:** Vấn đề gần như luôn nằm ở việc cấu hình sai giữa R2 và Worker. Hãy kiểm tra lại:
    *   Các `secret` bạn đã đặt bằng `wrangler secret put`.
    *   Tên bucket trong file `wrangler.toml` có chính xác không.
    *   Chính sách CORS của R2 (Bước 3D).
    *   Dùng lệnh `wrangler tail` trên máy tính cá nhân để xem log trực tiếp từ Worker đang chạy trên Cloudflare.
-   **Tính năng AI Assist thất bại:** Kiểm tra log của ứng dụng trên VPS (`pm2 logs books-app`). Lỗi có thể do bạn đã nhập sai hoặc quên tạo file `.env` chứa `OPENAI_API_KEY` trong thư mục `proxy-server`.
-   **Trang web không tải được:** Đảm bảo lệnh `npm run build` đã chạy thành công (ở thư mục gốc) và thư mục `dist` đã được tạo. Kiểm tra log của PM2.
