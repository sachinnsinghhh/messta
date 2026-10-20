import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 text-gray-900 selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}