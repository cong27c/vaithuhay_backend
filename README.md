🧭 BẮT ĐẦU TỪ: Checkout thành công (success: true)

Giả sử bạn có API /api/checkout
→ Nếu checkoutService trả về success: true, nghĩa là:

Hệ thống đã tạo Order, Payment record, Shipment info, Address info,...

Giỏ hàng đã chuyển thành đơn hàng.

Bước tiếp theo tùy thuộc phương thức thanh toán (payment_method).

💰 PHÂN NHÁNH: COD vs ONLINE PAYMENT
🟩 A. Nếu là COD (Thanh toán khi nhận hàng)
1️⃣ Hành động sau checkout:

Frontend chuyển ngay đến trang: /order/success/:orderId
(hoặc /thank-you)

Hiển thị thông tin đơn hàng + thông báo "Đơn hàng đã được ghi nhận".

2️⃣ Backend xử lý:

Cập nhật trạng thái đơn hàng:

order.status = "confirmed"; // Xác nhận ngay
payment.status = "pending"; // Sẽ thu khi giao hàng
shipment.status = "waiting"; // Chờ chuẩn bị hàng

Gửi email xác nhận đơn hàng cho khách.

Gửi thông báo đến Admin (dashboard).

3️⃣ Tiếp theo:

Admin chuẩn bị hàng → chuyển sang shipping.

Khi giao hàng xong, payment.status chuyển thành "paid", order.status = "completed".

🟦 B. Nếu là ONLINE PAYMENT (VNPay, MoMo, v.v.)
1️⃣ Sau checkout:

Frontend chuyển sang trang thanh toán, ví dụ /payment/:orderId.

Gọi API tạo payment session → redirect đến cổng thanh toán.

2️⃣ Khi người dùng hoàn tất thanh toán:

Cổng thanh toán (VD: VNPay) sẽ gửi webhook về server bạn.

Nếu thành công:

payment.status = "paid";
order.status = "paid";

Gửi email: “Thanh toán thành công”.

Nếu thất bại / người dùng hủy:

payment.status = "failed";
order.status = "payment_failed";

Gửi email: “Thanh toán thất bại, vui lòng thử lại”.

3️⃣ Frontend xử lý:

Sau khi redirect về /payment/result:

Nếu success → chuyển tới /order/success/:orderId.

Nếu fail → hiển thị /payment/fail/:orderId và nút “Thử lại”.

⚙️ LUỒNG HOẠT ĐỘNG TỔNG HỢP SAU CHECKOUT (TỪNG PHẦN)
Giai đoạn Mô tả / Đầu việc Trạng thái thành công Trạng thái thất bại

1. Checkout (POST /checkout) Tạo Order, Payment, Shipment order.status = "pending" -
2. Chuyển hướng thanh toán Nếu COD → sang trang success
   Nếu Online → sang trang Payment - -
3. Xác nhận thanh toán (Webhook / Callback) Hệ thống nhận phản hồi từ VNPay/MoMo payment.status = "paid"
   order.status = "paid" payment.status = "failed"
   order.status = "payment_failed"
4. Xác nhận đơn hàng (Admin/Auto) Admin duyệt đơn / Auto duyệt COD order.status = "confirmed" order.status = "cancelled"
5. Chuẩn bị hàng Cập nhật shipment, trừ tồn kho shipment.status = "waiting" -
6. Giao hàng (Shipping) Đang vận chuyển shipment.status = "shipping"
   order.status = "shipping" shipment.status = "failed"
   order.status = "failed"
7. Giao thành công / Hoàn tất Hàng đến tay khách shipment.status = "delivered"
   order.status = "completed" order.status = "failed"
8. Sau bán (Post-sale) Gửi mail cảm ơn, review, loyalty order.status = "completed" -
   🔁 Ví dụ minh họa chi tiết (case VNPay & COD)
   🔹 COD Flow
   checkout success
   ↓
   Order created → status = pending
   ↓
   Auto confirm COD order → status = confirmed
   ↓
   Prepare shipment → status = waiting
   ↓
   Deliver → shipping → delivered
   ↓
   Payment collected → payment.status = paid
   ↓
   Order completed

🔹 VNPay Flow
checkout success
↓
Order created → status = pending
↓
Redirect to VNPay
↓
VNPay callback success → payment.status = paid
↓
order.status = paid
↓
Admin confirm → order.status = confirmed
↓
Prepare → Ship → Deliver → Completed

🔻 Nếu VNPay thất bại / user hủy thanh toán:
checkout success
↓
Order created → status = pending
↓
Redirect to VNPay → user cancels
↓
VNPay callback fail
↓
payment.status = failed
order.status = payment_failed
↓
Frontend hiển thị trang “Thanh toán thất bại”
→ Cho phép “Thanh toán lại”

📬 Email / Notification gợi ý
Sự kiện Hành động
Checkout success “Đơn hàng đã được ghi nhận”
Payment success “Thanh toán thành công”
Payment fail “Thanh toán thất bại, thử lại”
Order confirmed “Shop đã xác nhận đơn hàng”
Shipped “Đơn hàng đang được giao”
Delivered “Đơn hàng đã được giao thành công”
Completed “Cảm ơn bạn, vui lòng đánh giá sản phẩm”
💡 Kết luận
Luồng chính Trạng thái Order Trạng thái Payment Kết quả hiển thị
COD confirmed → shipping → completed pending → paid Trang “Mua thành công”
Online Payment success paid → confirmed → completed paid Trang “Thanh toán thành công”
Online Payment fail payment_failed failed Trang “Thanh toán thất bại”

// NHỮNG ĐIỀU ĐÃ RÚT RA KHI BẢO VỆ

- Nên có một bảng lưu thông tin sản phẩm khi order (giá , tên sản phẩm, voucher sản phẩm đã áp dụng )
- check thời gian khả dụng voucher khi submit thanh toán
- nên xóa sản phẩm trong giỏ hàng sau khi người dùng đã checkout thành công
- vì đã xóa sản phẩm nên trong trang cá nhân nên có các đơn hàng đã mua
- Về tính năng order
  Luồng hoạt động tổng thể – Hybrid Reservation (mở song song)
  🧩 1. Giai đoạn Đăng ký (Preorder Phase)

Người dùng bấm “Đăng ký nhận thông báo mở bán”.

Hệ thống lưu vào bảng preorders với trạng thái registered.

Không trừ tồn kho thật, chỉ lưu danh sách chờ ưu tiên.

⏰ 2. Khi đến giờ mở bán (Launch Phase)

Khi job chạy (cronjob hoặc worker):

Hệ thống chia sản phẩm ra:

X% hàng (VD: 70%) dành riêng cho người đã preorder.

(100 – X)% hàng (VD: 30%) mở công khai cho tất cả khách hàng.

Với nhóm preorder:

Tạo preorder_slot (giữ chỗ thật trong 4 giờ).

Trừ tồn kho tương ứng.

Gửi email:

“Bạn có slot ưu tiên trong 4 giờ — hãy thanh toán ngay để giữ ưu đãi.”

Với nhóm public:

Vẫn thấy sản phẩm “Còn hàng”, nhưng chỉ mua được phần 30% mở công khai.

⏳ 3. Giai đoạn Giữ slot (Hold Phase)

Trong 4 giờ đầu, user có slot được quyền thanh toán.

Nếu user thanh toán → slot status = purchased.

Nếu quá 4h không thanh toán → slot status = expired, tự động trả lại hàng.

🔁 4. Hết hạn slot (Release Phase)

Cronjob kiểm tra slot mỗi 10–15 phút:

Slot hết hạn → trả lại quantity vào hàng công khai.

Gửi email:

“Slot của bạn đã hết hạn — sản phẩm hiện đang mở bán công khai.”

🌍 5. Giai đoạn Mở công khai (Public Phase)

Sau 4 giờ:

Toàn bộ slot preorder chưa mua được mở bán công khai.

Người dùng chưa đăng ký có thể mua bình thường.

Gửi thông báo cho danh sách public:

“Sản phẩm [Tên] hiện đã mở bán cho tất cả người dùng.”

✅ Kết quả đạt được
Mục tiêu Kết quả
Giữ quyền ưu tiên cho người đăng ký ✅ Có slot riêng, có thời gian giới hạn
Tránh “hết hàng ảo” ✅ Chỉ trừ lượng hàng trong slot, có giới hạn
Người chưa đăng ký vẫn có cơ hội mua ✅ Có phần hàng mở công khai hoặc mua lại sau 4h
Dễ quản lý ✅ Cronjob đơn giản, quantity đồng bộ
Tăng trải nghiệm ✅ Có thông báo, countdown, và nhắc nhở

Nếu bạn muốn bước tiếp, mình có thể giúp bạn viết code mẫu chi tiết (Node.js + SQL) cho toàn bộ 3 job chính:

Job launchPreorder()

Job expireSlot()

Job openPublicSale()

Bạn có muốn mình viết luôn 3 hàm logic này để bạn tích hợp vào backend hiện tại không?
