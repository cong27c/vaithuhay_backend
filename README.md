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
