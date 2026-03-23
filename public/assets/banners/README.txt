Luu bo banner mac dinh cua trang chu tai thu muc nay.

Mac dinh giao dien dang doc:
- public/assets/banners/banner1.png
- public/assets/banners/banner2.png
- public/assets/banners/banner3.png -> banner9.png

URL tuong ung tren trinh duyet:
- /ui/assets/banners/banner1.png
- /ui/assets/banners/banner2.png
- /ui/assets/banners/banner3.png -> /ui/assets/banners/banner9.png

Day la static asset duoc commit len Git de deploy production cho on dinh.

Neu sau nay lam tinh nang campaign/news:
- khong nen ghi de file vao thu muc nay
- nen tao module rieng de upload banner campaign
- nen luu metadata trong database, vi du: title, slug, image_url, target_url, published_at
- file upload campaign co the dat o public/uploads/campaign-banners/ hoac object storage
