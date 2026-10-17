# USPEAK Foundation — bản thử nghiệm trên máy

Giao diện và API thực cho tạo bản nháp, duyệt đúng phiên bản, lên lịch UTC+07:00, hủy lịch, nhật ký và lưu SQLite. Publishing chỉ là MOCK. Không kết nối AI, NAS từ xa hoặc mạng xã hội. Đây chưa phải MVP hoàn chỉnh và chưa phù hợp production/cloud.

## Khởi động nhanh trên Windows

Mở PowerShell trong thư mục này và chạy `powershell -File .\\start.ps1` nếu chính sách máy cho phép. Script tạo token tạm, sao chép vào clipboard và chạy server. Mở http://127.0.0.1:4317, dán token để đăng nhập. Không cần gửi token cho ai. Nếu máy chặn script, dùng cách PowerShell thủ công bên dưới; không cần hạ chính sách bảo mật máy.

## Khởi động trên Windows PowerShell
Cần Node.js 24. Không cần cài npm package. Tại thư mục này:

```powershell
$env:USPEAK_ADMIN_TOKEN = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
node server.mjs
```

Mở http://127.0.0.1:4317. Trong một PowerShell khác không có token của phiên đầu; tại cửa sổ đã tạo biến, trước khi chạy server có thể sao chép token vào clipboard bằng `Set-Clipboard $env:USPEAK_ADMIN_TOKEN`. Dán vào ô đăng nhập. Không gửi token lên GitHub hoặc cho người khác.

## Khởi động trên macOS/Linux

```sh
export USPEAK_ADMIN_TOKEN="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
node server.mjs
```

Dùng biến token trong terminal để đăng nhập local, không commit token. Server chỉ lắng nghe loopback. Cookie HttpOnly/SameSite Strict tồn tại 1 giờ; phiên hết hiệu lực khi server khởi động lại. SQLite nằm trong data/, bị gitignore. Không mở cổng này ra Internet. Triển khai cloud cần HTTPS, auth phù hợp và database PostgreSQL; không đưa SQLite này lên Vercel.

## Kiểm thử

```sh
node --test
```

Kiểm thử core và luồng HTTP thật gồm chặn truy cập chưa đăng nhập, chặn origin khác, tạo/duyệt/lên lịch và sửa nội dung làm hủy duyệt/lịch cũ. Chưa kiểm thử giao diện bằng trình duyệt.

## NAS và skill

```sh
node connector.mjs "D:/approved-folder"
```

Chỉ quét thư mục được chủ sở hữu cho phép. Không theo symlink, không ghi nguyên liệu, không thực thi SKILL.md. Output chứa đường dẫn và nội dung skill, cần giữ riêng tại PC. Chưa có connector kết nối cloud hoặc transcript.

## Phạm vi phiên bản
- Queue và receipt MOCK chống trùng trong một transaction SQLite. Không suy rộng thành bảo đảm exactly-once cho publisher thật.
- Sửa caption hủy lịch queued và duyệt cũ; phải duyệt phiên bản mới.
- Scheduler lưu giờ thật; worker MOCK chạy khi người dùng bấm nút. Chưa chạy tự động 06:00 hay đăng bài thật.
- Chưa có campaign, AI provider, Buffer, NAS retrieval hay model router. Các nút kênh là lựa chọn kiểm thử, không phải xác nhận đã hỗ trợ API nền tảng.
- Không sử dụng dữ liệu học viên, hình ảnh hay lời chứng thực trong mã nguồn.
