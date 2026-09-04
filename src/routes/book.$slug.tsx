import { createFileRoute } from "@tanstack/react-router";
import BookingPortal from "@/components/booking/BookingPortal";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({
    meta: [
      { title: "Book Your Appointment — Salon Booking" },
      {
        name: "description",
        content:
          "Choose your services, pick a stylist and lock a time slot in under a minute. Confirmation arrives instantly on WhatsApp.",
      },
      { property: "og:title", content: "Book Your Appointment" },
      {
        property: "og:description",
        content: "Reserve your chair online and confirm on WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalonBookingRoute,
});

function SalonBookingRoute() {
  const { slug } = Route.useParams();
  return <BookingPortal slug={slug} />;
}
