# Final Project API

## Giới thiệu

API backend cho hệ thống thương mại điện tử, xây dựng với Node.js, Express, Sequelize, JWT, hỗ trợ xác thực, quản lý sản phẩm, giỏ hàng, voucher, review, upload file, v.v.

## Cấu trúc thư mục

```
src/
├── config/           # Cấu hình hệ thống (DB, auth, env, ...)
├── controllers/      # Xử lý logic cho từng API endpoint
├── db/               # Kết nối và cấu hình database
├── emails/           # Gửi email (quên mật khẩu, xác thực, ...)
├── middlewares/      # Middleware cho xác thực, upload, xử lý lỗi,...
├── models/           # Định nghĩa các bảng dữ liệu (Sequelize models)
├── routes/           # Định nghĩa các route cho API và web
├── services/         # Xử lý nghiệp vụ, giao tiếp với models
├── utils/            # Hàm tiện ích (response, throwError, upload,...)
├── migrations/       # Quản lý migration cho DB
└── workers/          # Xử lý background jobs (nếu có)
```

## Flow xử lý request

1. **Route:** Định nghĩa endpoint, gắn middleware, controller.
2. **Middleware:** Xử lý xác thực, upload, validate,...
3. **Controller:** Nhận request, gọi service, trả response.
4. **Service:** Xử lý nghiệp vụ, thao tác với model.
5. **Model:** Tương tác với DB qua Sequelize.
6. **Response:** Trả về dữ liệu, mã lỗi, thông điệp.

**Ví dụ: Đăng nhập**

```
POST /auth/login
→ Controller: authController.login
→ Service: authService.login
→ Model: User
→ Response: access_token, set cookie refresh_token
```

## Cách chạy project

```sh
npm install
npm run dev
```

- Cấu hình biến môi trường trong `.env`
- DB: MySQL/PostgreSQL (cấu hình trong `src/config/`)
- Upload file: Multer, lưu vào thư mục `uploads/`

## Nhận xét & đề xuất cải thiện

- Đặt tên hàm, biến rõ ràng, chuẩn clean code.
- Tách rõ các tầng controller/service/model.
- Nên bổ sung middleware xử lý lỗi tập trung.
- Tăng bảo mật cookie, validate input, chuẩn hóa response.
- Có thể gom các module lớn thành domain riêng để dễ maintain.

---

/////////////////////////////////////////////////

🧩 I. TỔNG QUAN CẤU TRÚC DỮ LIỆU
Bảng Chức năng chính Quan hệ
products Lưu thông tin sản phẩm (giá, mô tả, ngày mở bán, trạng thái) Có nhiều preorder_campaigns
preorder_campaigns Đại diện cho một chiến dịch đặt trước của sản phẩm Thuộc về 1 product, có nhiều tiers & orders
preorder_tiers Các mức ưu đãi trong chiến dịch (Tier 1 tiên phong, Tier 2 ưu đãi, …) Thuộc về campaign, có thể có nhiều orders
preorder_orders Lưu thông tin người dùng đặt trước sản phẩm theo từng tier Thuộc về campaign, tier, và customer

📦 Preorder System - README

1. Mục đích

Hệ thống này cho phép quản lý chiến dịch đặt trước (preorder campaigns) cho sản phẩm.
Các chức năng chính bao gồm:

Tạo campaign với nhiều tier (mức đặt trước với giá, số lượng giới hạn).

Người dùng hoặc khách có thể đặt trước sản phẩm theo tier.

Tự động quản lý trạng thái campaign (upcoming → active → ended) bằng cron job.

Cập nhật trạng thái sản phẩm dựa trên trạng thái campaign.

2. Cấu trúc thư mục chính
   src/
   ├─ services/
   │ └─ preorder.service.js # Logic nghiệp vụ preorder
   ├─ controllers/
   │ └─ preorder.controller.js # Nhận request, gọi service, trả response
   ├─ routes/
   │ └─ preorder.routes.js # Định nghĩa route API
   ├─ cron/
   │ └─ preorderCron.js # Cron job quản lý trạng thái campaign
   └─ app.js # Entry point server, mount routes và start cron

3. Luồng hoạt động chi tiết
   3.1 Tạo Campaign

API: POST /api/preorder/campaigns
Controller: createCampaign → Service: PreorderService.createCampaign

Flow:

Client gửi thông tin:

productId, startDate, endDate, tiers (mảng tier), note.

Controller kiểm tra dữ liệu bắt buộc.

Gọi service createCampaign:

Tạo một record PreorderCampaign.

Tạo các record PreorderTier kèm theo.

Dùng transaction để đảm bảo atomicity (nếu có lỗi, rollback tất cả).

Trả về campaign mới tạo.

Kết quả: campaign + tiers được lưu vào DB, status mặc định là upcoming.

3.2 Lấy Campaigns

API: GET /api/preorder/campaigns
Controller: getCampaigns → Service: PreorderService.getActiveCampaigns

Flow:

Lấy danh sách các campaign active.

Bao gồm các tiers và thông tin sản phẩm.

Có thể phân trang (limit, offset).

Kết quả: danh sách campaign đang active.

3.3 Chi tiết Campaign

API: GET /api/preorder/campaigns/:id
Controller: getCampaignDetail → Service: PreorderService.getCampaignDetail

Flow:

Lấy campaign theo ID, kèm tiers sắp xếp theo order_index và thông tin sản phẩm.

Nếu không tìm thấy campaign → trả 404.

3.4 Đặt trước (Preorder)

API: POST /api/preorder/orders
Controller: placeOrder → Service: PreorderService.placePreorder

Flow:

Client gửi campaignId, tierId, quantity, và optional guestEmail.

Controller lấy userId từ req.user nếu đã auth.

Service placePreorder:

Bắt đầu transaction để tránh race condition.

Lock row PreorderTier (FOR UPDATE) để đảm bảo số lượng chính xác.

Kiểm tra số lượng còn lại (limit_quantity - sold_quantity).

Tạo PreorderOrder.

Cập nhật sold_quantity của tier.

Nếu campaign active → cập nhật Product.status = pre_order.

Commit transaction hoặc rollback nếu lỗi.

Kết quả: tạo preorder order, cập nhật số lượng slot còn lại trong tier.

3.5 Cron job tự động quản lý Campaign

File: src/cron/preorderCron.js → gọi Service: PreorderService.closeAndActivateCampaigns

Flow:

Cron chạy theo schedule (_/1 _ \* \* _ cho dev, 0 _ \* \* \* cho production).

Service closeAndActivateCampaigns:

Lấy tất cả campaign upcoming mà start_date <= now → chuyển thành active.

Đồng thời cập nhật Product.status = pre_order.

Lấy tất cả campaign active hoặc upcoming mà end_date <= now → chuyển thành ended.

Đồng thời cập nhật Product.status = available.

Transaction đảm bảo đồng bộ trạng thái campaign và sản phẩm.

3.6 Helper

Service: findNextAvailableTier(campaignId)

Trả về tier tiếp theo còn slot nếu tier hiện tại sold out.

Sắp xếp theo order_index tăng dần.

4. Start server

File: src/app.js

Flow:

Mount các middleware (bodyParser.json).

Mount route /api/preorder với preorderRoutes.

Start cron job startPreorderCron().

Listen server trên PORT.

Mục đích: server luôn chạy, cron tự động quản lý campaign, API sẵn sàng phục vụ client.

5. Luồng tổng quan
   Client API Request
   │
   ▼
   Route
   │
   ▼
   Controller (validate input)
   │
   ▼
   Service (logic nghiệp vụ + transaction)
   │
   ▼
   Database (Sequelize models)
   │
   ▼
   Response -> Controller -> Client

Cron Job (Preorder Activation/Closing)
│
▼
Service.closeAndActivateCampaigns()
│
▼
Update PreorderCampaign + Product.status

6. Mục tiêu mỗi hàm chính
   Hàm Mục đích
   createCampaign Tạo campaign + tiers
   getActiveCampaigns Lấy danh sách campaign đang active
   getCampaignDetail Lấy chi tiết campaign và tiers
   placePreorder Tạo preorder order, cập nhật sold_quantity, cập nhật status sản phẩm
   closeAndActivateCampaigns Cron job: chuyển trạng thái campaign và sản phẩm theo thời gian
   findNextAvailableTier Tìm tier còn slot nếu tier hiện tại sold out

///////// LUỒNG HOẠT ĐỘNG CỦA TRANG WEB

- Chia ra thành 2 luồng

* Customer (user đã đăng nhập)
* Guest (Khách vãng lai) -> Liên hệ với trực tiếp với bảng guest_ssessions
  🧩 Giai đoạn 1 — Guest truy cập lần đầu

1. Khi người dùng truy cập vào site (hoặc thực hiện hành động đầu tiên như thêm vào giỏ)

- Hệ thống kiểm tra trong cookie hoặc localStorage xem có session_id chưa.
- Nếu chưa có, tạo mới một session_id (UUID).

2. Hệ thống ghi vào bảng guest_sessions:
   {
   session_id: 'abc123-uuid',
   ip_address: '203.113.45.22',
   user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
   expires_at: '2025-10-25T00:00:00',
   }
3. Server gửi session_id lại cho client (qua cookie hoặc response header).

🔁 Giai đoạn 2 — Guest tiếp tục truy cập

- Mỗi request gửi lên server đều có kèm:

* session_id (cookie/localStorage)
* IP và user-agent trong request header.

- Server sẽ kiểm tra guest_sessions:

* Nếu session còn hạn (expires_at > now()), dùng lại.
* Nếu hết hạn hoặc không tồn tại, tạo session mới.

👥 Giai đoạn 3 — Guest trở thành customer

- Nếu guest đăng ký tài khoản hoặc đặt hàng thành công, hệ thống có thể:

* Gán customer_id vào guest_sessions.
