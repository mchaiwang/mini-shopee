"use client";

type Review = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
  images?: string[];
};

type Props = {
  productName: string;
  shopeeUrl?: string;
};

const demoReviews: Review[] = [
  {
    id: 1,
    name: "ลูกค้า A",
    rating: 5,
    comment: "คุณภาพสินค้าดีมาก แพ็กมาดี ใช้งานได้ตามที่ต้องการ",
    date: "2026-03-20",
    verified: true,
    images: [],
  },
  {
    id: 2,
    name: "ลูกค้า B",
    rating: 5,
    comment: "จัดส่งไว สินค้าตรงตามรูปและรายละเอียด แนะนำร้านนี้ครับ",
    date: "2026-03-18",
    verified: true,
    images: [],
  },
  {
    id: 3,
    name: "ลูกค้า C",
    rating: 4,
    comment: "โดยรวมโอเคมาก ราคาเหมาะสม ใช้งานได้จริง",
    date: "2026-03-15",
    verified: false,
    images: [],
  },
];

function renderStars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export default function ProductReviews({
  productName,
  shopeeUrl,
}: Props) {
  const totalReviews = demoReviews.length;
  const avgRating =
    totalReviews > 0
      ? (
          demoReviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews
        ).toFixed(1)
      : "0.0";

  return (
    <section
      style={{
        marginTop: 24,
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid #f3f3f3",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#222",
              marginBottom: 6,
            }}
          >
            รีวิวจากลูกค้า
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#666",
            }}
          >
            {productName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "#fff7f5",
              border: "1px solid #ffd9d1",
              color: "#ee4d2d",
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {avgRating}/5 • {totalReviews} รีวิว
          </div>

          {shopeeUrl ? (
            <a
              href={shopeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                background: "#ee4d2d",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
            >
              ดูรีวิวเพิ่มเติมใน Shopee
            </a>
          ) : null}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {demoReviews.map((review) => (
            <div
              key={review.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#222",
                      marginBottom: 4,
                    }}
                  >
                    {review.name}
                  </div>

                  <div
                    style={{
                      color: "#ee4d2d",
                      fontSize: 15,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    {renderStars(review.rating)}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "#888",
                      }}
                    >
                      {review.date}
                    </span>

                    {review.verified ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#16a34a",
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 999,
                          padding: "3px 8px",
                        }}
                      >
                        ซื้อจริง
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#333",
                }}
              >
                {review.comment}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "#777",
            lineHeight: 1.6,
          }}
        >
          รีวิวในส่วนนี้เป็นรีวิวจากลูกค้าในเว็บไซต์ของร้าน และหากต้องการดูความคิดเห็นเพิ่มเติม
          สามารถกดปุ่มไปดูต่อที่ Shopee ได้
        </div>
      </div>
    </section>
  );
}