import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange transition-colors mb-8">
                    <ArrowLeft size={16} />
                    Quay lại trang chủ
                </Link>

                <h1 className="text-4xl font-bold mb-2">Chính sách Bảo mật</h1>
                <p className="text-gray-400 text-sm mb-10">Cập nhật lần cuối: 29/03/2026</p>

                <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold mb-3">1. Giới thiệu</h2>
                        <p>
                            FoodieSnap Pro ("chúng tôi", "của chúng tôi") cam kết bảo vệ quyền riêng tư của bạn.
                            Chính sách Bảo mật này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ
                            thông tin cá nhân của bạn khi sử dụng dịch vụ FoodieSnap Pro tại <strong>anhnet.top</strong>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">2. Thông tin chúng tôi thu thập</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Thông tin tài khoản:</strong> Email, tên hiển thị, ảnh đại diện (khi đăng nhập bằng Google).</li>
                            <li><strong>Ảnh tải lên:</strong> Ảnh món ăn và ảnh nền bạn tải lên để xử lý. Ảnh được lưu trữ tạm thời và vĩnh viễn trên Firebase Storage.</li>
                            <li><strong>Dữ liệu sử dụng:</strong> Số lượng ảnh đã tạo, credits đã dùng, lịch sử giao dịch.</li>
                            <li><strong>Thông tin thanh toán:</strong> Chúng tôi không lưu thông tin thẻ ngân hàng. Chỉ lưu mã đơn hàng và số tiền giao dịch.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">3. Cách chúng tôi sử dụng thông tin</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Cung cấp và cải thiện dịch vụ tạo ảnh AI.</li>
                            <li>Quản lý tài khoản và credits của bạn.</li>
                            <li>Xử lý thanh toán và xác nhận giao dịch.</li>
                            <li>Gửi thông báo liên quan đến dịch vụ (khi cần thiết).</li>
                            <li>Phát hiện và ngăn chặn gian lận.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">4. Chia sẻ thông tin</h2>
                        <p>
                            Chúng tôi <strong>không bán</strong> thông tin cá nhân của bạn cho bên thứ ba.
                            Chúng tôi chỉ chia sẻ thông tin với:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong>Google Firebase:</strong> Để lưu trữ dữ liệu và xác thực người dùng.</li>
                            <li><strong>Google Gemini API:</strong> Để xử lý ảnh (ảnh được gửi dưới dạng dữ liệu để xử lý, không lưu trữ bởi Google).</li>
                            <li><strong>SePay:</strong> Để xử lý webhook thanh toán.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">5. Bảo mật dữ liệu</h2>
                        <p>
                            Chúng tôi sử dụng Firebase Security Rules để đảm bảo chỉ bạn mới có thể truy cập
                            dữ liệu của chính mình. Kết nối được mã hóa bằng HTTPS/TLS. Tuy nhiên, không có
                            hệ thống nào an toàn tuyệt đối và chúng tôi không thể đảm bảo bảo mật 100%.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">6. Quyền của bạn</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Quyền truy cập và xem dữ liệu cá nhân.</li>
                            <li>Quyền yêu cầu xóa tài khoản và tất cả dữ liệu liên quan.</li>
                            <li>Quyền cập nhật thông tin cá nhân.</li>
                        </ul>
                        <p className="mt-3">
                            Để thực hiện các quyền này, hãy liên hệ: <a href="mailto:support@anhnet.top" className="text-brand-orange hover:underline">support@anhnet.top</a>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">7. Cookies</h2>
                        <p>
                            Chúng tôi sử dụng cookies cần thiết để duy trì phiên đăng nhập của bạn thông qua Firebase Authentication.
                            Không sử dụng cookies theo dõi quảng cáo.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">8. Thay đổi chính sách</h2>
                        <p>
                            Chúng tôi có thể cập nhật Chính sách Bảo mật này theo thời gian. Thay đổi quan trọng sẽ
                            được thông báo qua email hoặc thông báo trên ứng dụng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">9. Liên hệ</h2>
                        <p>
                            Nếu có câu hỏi về Chính sách Bảo mật, vui lòng liên hệ:{' '}
                            <a href="mailto:support@anhnet.top" className="text-brand-orange hover:underline">support@anhnet.top</a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm">
                    <Link to="/terms-of-service" className="text-brand-orange hover:underline">Điều khoản dịch vụ</Link>
                    <Link to="/refund-policy" className="text-brand-orange hover:underline">Chính sách hoàn tiền</Link>
                </div>
            </div>
        </div>
    );
}
