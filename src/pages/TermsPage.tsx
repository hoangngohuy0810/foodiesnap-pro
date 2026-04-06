import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange transition-colors mb-8">
                    <ArrowLeft size={16} />
                    Quay lại trang chủ
                </Link>

                <h1 className="text-4xl font-bold mb-2">Điều khoản Dịch vụ</h1>
                <p className="text-gray-400 text-sm mb-10">Cập nhật lần cuối: 29/03/2026</p>

                <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold mb-3">1. Chấp nhận điều khoản</h2>
                        <p>
                            Bằng cách truy cập và sử dụng FoodieSnap Pro, bạn đồng ý bị ràng buộc bởi các Điều khoản
                            Dịch vụ này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">2. Mô tả dịch vụ</h2>
                        <p>
                            FoodieSnap Pro là nền tảng tạo ảnh món ăn chuyên nghiệp sử dụng trí tuệ nhân tạo (AI Gemini).
                            Người dùng tải ảnh lên, chọn cài đặt và nhận ảnh đã được nâng cao chất lượng.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">3. Tài khoản người dùng</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Bạn phải cung cấp thông tin chính xác khi đăng ký.</li>
                            <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập.</li>
                            <li>Mỗi người dùng chỉ được phép có một tài khoản.</li>
                            <li>Tài khoản mới nhận 3 credits miễn phí (không thể chuyển nhượng).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">4. Hệ thống Credits</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>1 credit = 1 ảnh được tạo.</li>
                            <li>Credits không hết hạn sau khi mua.</li>
                            <li>Credits không thể chuyển nhượng giữa các tài khoản.</li>
                            <li>Credits miễn phí không thể quy đổi thành tiền mặt.</li>
                            <li>Hệ thống tự động hoàn trả credits nếu quá trình tạo ảnh thất bại.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">5. Thanh toán</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Thanh toán qua chuyển khoản ngân hàng VietQR.</li>
                            <li>Credits được cộng tự động sau khi xác nhận thanh toán thành công.</li>
                            <li>Chúng tôi có quyền thay đổi giá cả sau khi thông báo trước 7 ngày.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">6. Nội dung và Quyền sở hữu trí tuệ</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Ảnh gốc bạn tải lên vẫn thuộc quyền sở hữu của bạn.</li>
                            <li>Ảnh được tạo bởi AI thuộc quyền sở hữu của bạn và có thể dùng cho mục đích thương mại.</li>
                            <li>Bạn không được tải lên ảnh vi phạm bản quyền, nội dung không phù hợp, hoặc ảnh người khác mà không có sự đồng ý.</li>
                            <li>Chúng tôi có thể sử dụng ảnh (đã ẩn danh) để cải thiện dịch vụ, trừ khi bạn từ chối.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">7. Hành vi bị cấm</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Sử dụng dịch vụ để tạo nội dung bất hợp pháp.</li>
                            <li>Cố gắng phá vỡ hoặc lạm dụng hệ thống.</li>
                            <li>Tạo tài khoản giả mạo để nhận credits miễn phí.</li>
                            <li>Reverse engineer hoặc sao chép dịch vụ.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">8. Giới hạn trách nhiệm</h2>
                        <p>
                            FoodieSnap Pro không đảm bảo dịch vụ hoạt động liên tục, không có lỗi.
                            Chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ.
                            Trách nhiệm tối đa của chúng tôi không vượt quá số tiền bạn đã thanh toán trong 30 ngày gần nhất.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">9. Chấm dứt dịch vụ</h2>
                        <p>
                            Chúng tôi có quyền tạm dừng hoặc chấm dứt tài khoản vi phạm Điều khoản này mà không cần thông báo trước.
                            Bạn có thể xóa tài khoản bất cứ lúc nào bằng cách liên hệ hỗ trợ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">10. Luật áp dụng</h2>
                        <p>
                            Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết
                            tại tòa án có thẩm quyền tại Việt Nam.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">11. Liên hệ</h2>
                        <p>
                            Câu hỏi về Điều khoản Dịch vụ:{' '}
                            <a href="mailto:support@anhnet.top" className="text-brand-orange hover:underline">support@anhnet.top</a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm">
                    <Link to="/privacy-policy" className="text-brand-orange hover:underline">Chính sách bảo mật</Link>
                    <Link to="/refund-policy" className="text-brand-orange hover:underline">Chính sách hoàn tiền</Link>
                </div>
            </div>
        </div>
    );
}
