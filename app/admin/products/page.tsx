"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  descriptionLong?: string;
  careNote?: string;
  category: string;
  stock: number;
  reviewUrl?: string;
};

type CurrentUser = {
  id: string;
  name: string;
  role: string;
};

type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [categories, setCategories] = useState<CategoryNode[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("/no-image.png");
  const [images, setImages] = useState<string[]>([]);
  const [shortDescription, setShortDescription] = useState("");
  const [descriptionLong, setDescriptionLong] = useState("");
  const [careNote, setCareNote] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");

  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [leafCategoryId, setLeafCategoryId] = useState("");

  const selectedMainCategory = useMemo(
    () => categories.find((item) => item.id === mainCategoryId) || null,
    [categories, mainCategoryId]
  );

  const selectedSubCategory = useMemo(
    () =>
      selectedMainCategory?.children?.find((item) => item.id === subCategoryId) ||
      null,
    [selectedMainCategory, subCategoryId]
  );

  const selectedLeafCategory = useMemo(
    () =>
      selectedSubCategory?.children?.find((item) => item.id === leafCategoryId) ||
      null,
    [selectedSubCategory, leafCategoryId]
  );

  const normalizeImages = (product: Partial<Product> | null | undefined) => {
    const list = Array.isArray(product?.images)
      ? product.images.filter(Boolean)
      : [];
    const merged = [...list];

    if (product?.image && !merged.includes(product.image)) {
      merged.unshift(product.image);
    }

    return merged.filter(Boolean).slice(0, 4);
  };

  const buildCategoryText = (
    mainNode?: CategoryNode | null,
    subNode?: CategoryNode | null,
    leafNode?: CategoryNode | null
  ) => {
    if (!mainNode || !subNode || !leafNode) return "";
    return `${mainNode.name} > ${subNode.name} > ${leafNode.name}`;
  };

  const parseCategoryText = (categoryText: string) => {
    const parts = String(categoryText || "")
      .split(">")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length !== 3) {
      return {
        mainId: "",
        subId: "",
        leafId: "",
      };
    }

    const mainNode = categories.find((item) => item.name === parts[0]) || null;
    const subNode =
      mainNode?.children?.find((item) => item.name === parts[1]) || null;
    const leafNode =
      subNode?.children?.find((item) => item.name === parts[2]) || null;

    return {
      mainId: mainNode?.id || "",
      subId: subNode?.id || "",
      leafId: leafNode?.id || "",
    };
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();

      const items = Array.isArray(data.products) ? data.products : [];
      const normalized = items.map((product: Product) => {
        const mergedImages = normalizeImages(product);
        return {
          ...product,
          image: mergedImages[0] || product.image || "/no-image.png",
          images: mergedImages,
          reviewUrl: product.reviewUrl || "",
          descriptionLong: product.descriptionLong || "",
          careNote: product.careNote || "",
        };
      });

      setProducts(normalized);
    } catch (error) {
      console.error(error);
      alert("โหลดข้อมูลสินค้าไม่สำเร็จ");
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (error) {
      console.error(error);
      alert("โหลดแคทตาล็อคสินค้าไม่สำเร็จ");
      setCategories([]);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        const me = data?.user || null;

        if (!me || me.role !== "admin") {
          alert("ไม่มีสิทธิ์เข้าใช้งานหน้านี้");
          window.location.href = "/";
          return;
        }

        setUser(me);
        await Promise.all([loadProducts(), loadCategories()]);
      } catch (error) {
        console.error(error);
        window.location.href = "/login";
      } finally {
        setIsReady(true);
      }
    };

    checkUser();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setPrice("");
    setImage("/no-image.png");
    setImages([]);
    setShortDescription("");
    setDescriptionLong("");
    setCareNote("");
    setCategory("");
    setStock("");
    setReviewUrl("");
    setMainCategoryId("");
    setSubCategoryId("");
    setLeafCategoryId("");
  };

  const startEdit = (product: Product) => {
    const mergedImages = normalizeImages(product);
    const parsed = parseCategoryText(product.category || "");

    setEditingId(product.id);
    setName(product.name);
    setSlug(product.slug);
    setPrice(String(product.price));
    setImage(mergedImages[0] || product.image || "/no-image.png");
    setImages(mergedImages);
    setShortDescription(product.shortDescription);
    setDescriptionLong(product.descriptionLong || "");
    setCareNote(product.careNote || "");
    setCategory(product.category || "");
    setStock(String(product.stock));
    setReviewUrl(product.reviewUrl || "");
    setMainCategoryId(parsed.mainId);
    setSubCategoryId(parsed.subId);
    setLeafCategoryId(parsed.leafId);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadSingleImage = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("/api/upload-product-image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "อัปโหลดรูปไม่สำเร็จ");
    }

    return data.imageUrl as string;
  };

  const uploadImages = async (files: FileList | File[]) => {
    try {
      const fileArray = Array.from(files || []);
      if (fileArray.length === 0) return;

      setUploadingImage(true);

      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        if (uploadedUrls.length + images.length >= 4) break;

        const imageUrl = await uploadSingleImage(file);
        uploadedUrls.push(imageUrl);
      }

      setImages((prev) => {
        const merged = [...prev, ...uploadedUrls]
          .filter(Boolean)
          .filter((item, index, arr) => arr.indexOf(item) === index)
          .slice(0, 4);

        if (!image || image === "/no-image.png") {
          setImage(merged[0] || "/no-image.png");
        }

        return merged;
      });

      alert(`อัปโหลดสำเร็จ ${uploadedUrls.length} รูป`);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูป");
    } finally {
      setUploadingImage(false);
    }
  };

  const setAsCover = (img: string) => {
    setImage(img);
    setImages((prev) => {
      const filtered = prev.filter((item) => item !== img);
      return [img, ...filtered].slice(0, 4);
    });
  };

  const removeImageAt = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);

      if (next.length === 0) {
        setImage("/no-image.png");
      } else if (image === prev[index]) {
        setImage(next[0]);
      }

      return next;
    });
  };

  const onChangeImageInput = (value: string) => {
    setImage(value);

    setImages((prev) => {
      const cleaned = prev.filter(Boolean).filter((item) => item !== value);
      if (!value) return cleaned.slice(0, 4);
      return [value, ...cleaned].slice(0, 4);
    });
  };

  const onChangeMainCategory = (value: string) => {
    setMainCategoryId(value);
    setSubCategoryId("");
    setLeafCategoryId("");
    setCategory("");
  };

  const onChangeSubCategory = (value: string) => {
    setSubCategoryId(value);
    setLeafCategoryId("");
    setCategory("");
  };

  const onChangeLeafCategory = (value: string) => {
    setLeafCategoryId(value);

    const leafNode =
      selectedSubCategory?.children?.find((item) => item.id === value) || null;

    const nextCategory = buildCategoryText(
      selectedMainCategory,
      selectedSubCategory,
      leafNode
    );

    setCategory(nextCategory);
  };

  const saveProduct = async () => {
    const finalCategory = buildCategoryText(
      selectedMainCategory,
      selectedSubCategory,
      selectedLeafCategory
    );

    if (
      !name ||
      !slug ||
      !price ||
      !shortDescription ||
      !finalCategory ||
      !stock
    ) {
      alert("กรอกข้อมูลสินค้าให้ครบ");
      return;
    }

    if (Number.isNaN(Number(price)) || Number.isNaN(Number(stock))) {
      alert("กรุณากรอกราคาและสต๊อกให้เป็นตัวเลข");
      return;
    }

    try {
      setLoading(true);

      const method = editingId ? "PUT" : "POST";

      const mergedImages = (() => {
        const list = images.filter(Boolean);
        const normalized =
          image && image !== "/no-image.png"
            ? [image, ...list.filter((img) => img !== image)]
            : list;
        return normalized.slice(0, 4);
      })();

      const coverImage = mergedImages[0] || image || "/no-image.png";

      const res = await fetch("/api/products", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          name,
          slug,
          price: Number(price),
          image: coverImage,
          images: mergedImages,
          shortDescription,
          descriptionLong: descriptionLong.trim(),
          careNote: careNote.trim(),
          category: finalCategory,
          stock: Number(stock),
          reviewUrl: reviewUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "บันทึกสินค้าไม่สำเร็จ");
        return;
      }

      const wasEditing = !!editingId;

      resetForm();
      await loadProducts();
      alert(wasEditing ? "แก้ไขสินค้าสำเร็จ" : "เพิ่มสินค้าสำเร็จ");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึกสินค้า");
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (id: number) => {
    const confirmed = window.confirm("ต้องการลบสินค้านี้ใช่หรือไม่");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "ลบสินค้าไม่สำเร็จ");
        return;
      }

      await loadProducts();
      alert("ลบสินค้าเรียบร้อย");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบสินค้า");
    }
  };

  if (!isReady) {
    return <main style={{ padding: "24px" }}>กำลังตรวจสอบสิทธิ์...</main>;
  }

  if (!user) {
    return null;
  }

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <h1 style={{ fontSize: "30px", fontWeight: 800, margin: 0 }}>
          จัดการสินค้า
        </h1>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <a href="/admin" style={secondaryLinkButtonStyle}>
            กลับ Dashboard
          </a>
          <a href="/" style={secondaryLinkButtonStyle}>
            ไปหน้าร้าน
          </a>
        </div>
      </div>

      <section
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {editingId ? `แก้ไขสินค้า #${editingId}` : "เพิ่มสินค้าใหม่"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "14px",
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อสินค้า"
            style={inputStyle}
          />

          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug เช่น royal-jelly"
            style={inputStyle}
          />

          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ราคา"
            style={inputStyle}
          />

          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="จำนวนสต๊อก"
            style={inputStyle}
          />

          <div style={{ display: "grid", gap: "6px" }}>
            <label style={labelStyle}>หมวดหมู่สินค้า</label>

            <select
              value={mainCategoryId}
              onChange={(e) => onChangeMainCategory(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- เลือกหมวดหลัก --</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={subCategoryId}
              onChange={(e) => onChangeSubCategory(e.target.value)}
              style={inputStyle}
              disabled={!mainCategoryId}
            >
              <option value="">-- เลือกหมวดย่อย --</option>
              {(selectedMainCategory?.children || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              value={leafCategoryId}
              onChange={(e) => onChangeLeafCategory(e.target.value)}
              style={inputStyle}
              disabled={!subCategoryId}
            >
              <option value="">-- เลือกหมวดย่อยชั้น 3 --</option>
              {(selectedSubCategory?.children || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <input
            value={image}
            onChange={(e) => onChangeImageInput(e.target.value)}
            placeholder="รูปหลัก เช่น /uploads/products/xxx.jpg"
            style={inputStyle}
          />

          <input
            value={reviewUrl}
            onChange={(e) => setReviewUrl(e.target.value)}
            placeholder="ลิงก์รีวิว เช่น https://shopee.co.th/... หรือ https://vt.tiktok.com/..."
            style={{ ...inputStyle, gridColumn: "1 / -1" }}
          />

          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="คำอธิบายสินค้า"
            style={{
              ...inputStyle,
              minHeight: "100px",
              gridColumn: "1 / -1",
              resize: "vertical",
            }}
          />

          <textarea
            value={descriptionLong}
            onChange={(e) => setDescriptionLong(e.target.value)}
            placeholder="รายละเอียดสินค้าแบบยาว"
            style={{
              ...inputStyle,
              minHeight: "180px",
              gridColumn: "1 / -1",
              resize: "vertical",
            }}
          />

          <textarea
            value={careNote}
            onChange={(e) => setCareNote(e.target.value)}
            placeholder="Care Note / คำแนะนำการดูแล"
            style={{
              ...inputStyle,
              minHeight: "130px",
              gridColumn: "1 / -1",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "14px",
            padding: "14px",
            border: "1px dashed #ddd",
            borderRadius: "12px",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>
            อัปโหลดรูปสินค้าได้สูงสุด 4 รูป
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                uploadImages(files);
                e.currentTarget.value = "";
              }
            }}
          />

          <div style={{ marginTop: "10px", color: "#666" }}>
            {uploadingImage
              ? "กำลังอัปโหลดรูป..."
              : `อัปโหลดแล้ว ${images.length}/4 รูป`}
          </div>

          {images.length > 0 ? (
            <div
              style={{
                marginTop: "14px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "12px",
              }}
            >
              {images.map((img, index) => {
                const isCover = img === image;

                return (
                  <div
                    key={`${img}-${index}`}
                    style={{
                      border: isCover ? "2px solid #f28c28" : "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "10px",
                      background: "#fff",
                    }}
                  >
                    <img
                      src={img}
                      alt={`preview-${index + 1}`}
                      style={{
                        width: "100%",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "10px",
                        border: "1px solid #eee",
                      }}
                    />

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        color: isCover ? "#f28c28" : "#666",
                        fontWeight: isCover ? 800 : 500,
                      }}
                    >
                      {isCover ? "รูปหลัก" : `รูปที่ ${index + 1}`}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setAsCover(img)}
                        style={smallBlueButtonStyle}
                      >
                        ตั้งเป็นรูปหลัก
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImageAt(index)}
                        style={smallRedButtonStyle}
                      >
                        ลบรูป
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {image ? (
            <div style={{ marginTop: "12px", color: "#666", fontSize: "14px" }}>
              รูปหลักปัจจุบัน: {image}
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button onClick={saveProduct} style={mainButtonStyle} disabled={loading}>
            {loading ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
          </button>

          <button onClick={resetForm} style={secondaryButtonStyle}>
            ล้างฟอร์ม
          </button>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "16px",
          padding: "20px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>รายการสินค้า</h2>

        {products.length === 0 ? (
          <p>ยังไม่มีสินค้า</p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {products.map((product) => {
              const productImages = normalizeImages(product);

              return (
                <div
                  key={product.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: "14px", alignItems: "start" }}>
                    <img
                      src={product.image || "/no-image.png"}
                      alt={product.name}
                      style={{
                        width: "110px",
                        height: "110px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: "1px solid #ddd",
                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div style={{ fontWeight: 800, fontSize: "18px" }}>
                        {product.name}
                      </div>
                      <div style={{ color: "#666", marginTop: "4px" }}>
                        slug: {product.slug}
                      </div>
                      <div style={{ color: "#666", marginTop: "4px" }}>
                        หมวดหมู่: {product.category}
                      </div>
                      <div style={{ color: "#666", marginTop: "4px" }}>
                        ราคา: ฿{Number(product.price).toFixed(2)}
                      </div>
                      <div style={{ color: "#666", marginTop: "4px" }}>
                        stock: {product.stock}
                      </div>
                      <div style={{ color: "#666", marginTop: "4px" }}>
                        จำนวนรูป: {productImages.length}/4
                      </div>
                      <div
                        style={{
                          color: "#666",
                          marginTop: "4px",
                          wordBreak: "break-all",
                        }}
                      >
                        reviewUrl: {product.reviewUrl || "-"}
                      </div>
                      <div style={{ marginTop: "8px" }}>{product.shortDescription}</div>

                      {product.descriptionLong ? (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: "#fafafa",
                            color: "#444",
                            lineHeight: 1.7,
                            whiteSpace: "pre-line",
                          }}
                        >
                          <strong>รายละเอียดสินค้า:</strong>
                          <br />
                          {product.descriptionLong}
                        </div>
                      ) : null}

                      {product.careNote ? (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            background: "#fff8ec",
                            color: "#444",
                            lineHeight: 1.7,
                            whiteSpace: "pre-line",
                          }}
                        >
                          <strong>Care Note:</strong>
                          <br />
                          {product.careNote}
                        </div>
                      ) : null}

                      {product.reviewUrl ? (
                        <div style={{ marginTop: "10px" }}>
                          <a
                            href={product.reviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "#f59e0b",
                              color: "#fff",
                              textDecoration: "none",
                              fontWeight: 700,
                              fontSize: "14px",
                            }}
                          >
                            เปิดลิงก์รีวิว
                          </a>
                        </div>
                      ) : null}

                      {productImages.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                            marginTop: "12px",
                          }}
                        >
                          {productImages.map((img, idx) => (
                            <img
                              key={`${img}-${idx}`}
                              src={img}
                              alt={`${product.name}-${idx + 1}`}
                              style={{
                                width: "56px",
                                height: "56px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                border:
                                  img === product.image
                                    ? "2px solid #f28c28"
                                    : "1px solid #ddd",
                              }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => startEdit(product)} style={editButtonStyle}>
                      แก้ไข
                    </button>

                    <button
                      onClick={() => removeProduct(product.id)}
                      style={deleteButtonStyle}
                    >
                      ลบสินค้า
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  fontSize: "15px",
  outline: "none",
  background: "#fff",
};

const mainButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "none",
  background: "#f28c28",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  background: "#fff",
  color: "#333",
  fontWeight: 700,
  cursor: "pointer",
};

const editButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryLinkButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: "10px",
  background: "#fff",
  color: "#333",
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid #ddd",
};

const smallBlueButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "13px",
};

const smallRedButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "none",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "13px",
};