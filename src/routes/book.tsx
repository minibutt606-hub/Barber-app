import { createFileRoute } from "@tanstack/react-router";
import BookingPortal from "@/components/booking/BookingPortal";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book an Appointment — Paragon Barber" },
      {
        name: "description",
        content:
          "Reserve haircuts, hot towel shaves, facials and packages with your preferred stylist at Paragon Barber.",
      },
      { property: "og:title", content: "Book an Appointment — Paragon Barber" },
      {
        property: "og:description",
        content: "Choose services, stylist and time slot, then confirm instantly on WhatsApp.",
      },
    ],
  }),
  component: BookingPortal,
});
