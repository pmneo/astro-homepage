import Hero from "@/components/Hero";
import ObservatorySection from "@/components/ObservatorySection";
import EquipmentSection from "@/components/EquipmentSection";
import GallerySection from "@/components/GallerySection";
import SkyMapSection from "@/components/SkyMapSection";
import ExploreSection from "@/components/ExploreSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <ObservatorySection />
      <EquipmentSection />
      <GallerySection />
      <SkyMapSection />
      <ExploreSection />
      <Footer />
    </>
  );
}
