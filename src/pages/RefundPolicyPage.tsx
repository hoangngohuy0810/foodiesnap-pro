import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-orange transition-colors mb-8">
                    <ArrowLeft size={16} />
                    Quay lại trang chủ
                </Link>

                <h1 className="text-4xl font-bold mb-2">Chính sách Hoàn tiền</h1>
                <p className="text-gray-400 text-sm mb-10">Cập nhật lần cuối: 29/03/2026</p>

                <div className="space-y-8 text-gray-700 leading-relaxed">

                    {/* Auto-refund highlight */}
                    <div className="p-5 bg-green-50 border border-green-200 rounded-2xl">
                        <h3 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            Hoàn credits tự động — Không bao giờ mất credits vô lý
                        </h3>
                        <p className="text-green-600 text-sm">
                            Nếu AI tạo ảnh thất bại do lỗi kỹ thuật, hệ thống sẽ <strong>tự động hoàn trả 100% credits</strong> ngay lập tức.
                            Bạn sẽ nhận thông báo trong ứng dụng xác nhận hoàn credits.
                        </p>
                    </div>

                    <section>
                        <h2 className="text-xl font-bold mb-3">1. Hoàn credits tự động</h2>
                        <p className="mb-3">
                            Credits sẽ được hoàn tự động trong các trường hợp sau:
                        </p>
                        <ul className="space-y-2">
                            {[
                                'Lỗi API từ phía Google Gemini',
                                'Hết thời gian xử lý (timeout)',
                                'Server gặp sự cố trong quá trình tạo ảnh',
                                'Ảnh output trống hoặc không hợp lệ',
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">2. Hoàn tiền mặt</h2>
                        <p className="mb-4">Chúng tôi hỗ trợ hoàn tiền trong các trường hợp sau:</p>

                        <div className="grid gap-3">
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    Được hoàn tiền
                                </h4>
                                <ul className="space-y-1 text-sm text-green-600">
                                    <li>• Giao dịch thanh toán trùng lặp (cùng một đơn hàng)</li>
                                    <li>• Credits không được cộng sau 24 giờ kể từ khi thanh toán thành công</li>
                                    <li>• Lỗi kỹ thuật nghiêm trọng khiến dịch vụ không sử dụng được {'>'} 48 giờ</li>
                                </ul>
                            </div>

                            <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                                    <XCircle size={16} />
                                    Không được hoàn tiền
                                </h4>
                                <ul className="space-y-1 text-sm text-red-500">
                                    <li>• Credits đã được sử dụng để tạo ảnh thành công</li>
                                    <li>• Không hài lòng với chất lượng ảnh (do AI có tính ngẫu nhiên)</li>
                                    <li>• Tài khoản vi phạm Điều khoản Dịch vụ</li>
                                    <li>• Yêu cầu hoàn tiền sau hơn 30 ngày</li>
                                    <li>• Credits miễn phí (free trial)</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">3. Quy trình yêu cầu hoàn tiền</h2>
                        <ol className="list-decimal pl-6 space-y-2 text-sm">
                            <li>Gửi email đến <a href="mailto:support@foodiesnap.pro" className="text-brand-orange hover:underline">support@foodiesnap.pro</a></li>
                            <li>Tiêu đề: "Yêu cầu hoàn tiền - [Mã đơn hàng]"</li>
                            <li>Nội dung: Mô tả lý do, kèm ảnh chụp màn hình nếu có</li>
                            <li>Chúng tôi sẽ phản hồi trong vòng 2 ngày làm việc</li>
                            <li>Hoàn tiền được thực hiện qua chuyển khoản ngân hàng trong 3-5 ngày làm việc</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">4. Lưu ý</h2>
                        <ul className="list-disc pl-6 space-y-2 text-sm">
                            <li>
                                <strong>Hoàn credits (không phải tiền mặt)</strong> là phương thức ưu tiên cho hầu hết các trường hợp.
                            </li>
                            <li>Chúng tôi có quyền từ chối hoàn tiền nếu phát hiện hành vi gian lận.</li>
                            <li>Chính sách này có thể thay đổi và sẽ được thông báo trước khi áp dụng.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">5. Liên hệ hỗ trợ</h2>
                        <p className="text-sm">
                            Email: <a href="mailto:support@foodiesnap.pro" className="text-brand-orange hover:underline">support@foodiesnap.pro</a>
                            <br />
                            Thời gian hỗ trợ: 8:00 – 22:00, Thứ 2 – Chủ nhật
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 flex gap-6 text-sm">
                    <Link to="/privacy-policy" className="text-brand-orange hover:underline">Chính sách bảo mật</Link>
                    <Link to="/terms-of-service" className="text-brand-orange hover:underline">Điều khoản dịch vụ</Link>
                </div>
            </div>
        </div>
    );
}
