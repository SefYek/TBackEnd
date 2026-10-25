"use client";

import React, { useMemo, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Card,
  CardContent,
  CardMedia,
  Button,
  Typography,
  TextField,
  Alert,
  AlertTitle,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

const getTheme = () =>
  createTheme({
    direction: "rtl",
    palette: {
      mode: "light",
      primary: {
        main: "#2563EB",
        light: "#EFF6FF",
        dark: "#1D4ED8",
        contrastText: "#FFFFFF",
      },
      background: {
        default: "#F1F5F9",
        paper: "#FFFFFF",
      },
      text: {
        primary: "#0F172A",
        secondary: "#64748B",
      },
    },
    typography: {
      fontFamily: "Vazirmatn, sans-serif",
    },
    shape: {
      borderRadius: 12,
    },
  });

export interface PostItem {
  id: number | string;
  title: string;
  info: string;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
}

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
  status?: number;
  details?: string;
} | null;

export default function HomePage() {
  const theme = useMemo(() => getTheme(), []);

  // فیلدهای ساخت پست
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postImageFile, setPostImageFile] = useState<File | null>(null);
  const [postImageName, setPostImageName] = useState<string>("");
  const [postTitle, setPostTitle] = useState("");
  const [postInfo, setPostInfo] = useState("");

  // وضعیت ارسال پست
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // وضعیت دریافت پست‌ها (GET)
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isFetchingPosts, setIsFetchingPosts] = useState(false);
  const [postsFetched, setPostsFetched] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  // وضعیت و فیلدهای دیالوگ ویرایش و آپدیت پست
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInfo, setEditInfo] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState<FeedbackState>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostImageFile(file);
      setPostImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPostImage(null);
    setPostImageFile(null);
    setPostImageName("");
  };

  // ارسال پست جدید (POST) به آدرس http://127.0.0.1:8000/api/posts/
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postTitle.trim()) {
      setFeedback({
        type: "error",
        message: "لطفاً عنوان پست را وارد کنید.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    console.log("🚀 در حال ارسال درخواست POST به http://127.0.0.1:8000/api/posts/ با داده‌ها:", {
      title: postTitle.trim(),
      info: postInfo.trim(),
      image: postImageFile?.name || null,
    });

    try {
      const formData = new FormData();
      formData.append("title", postTitle.trim());
      formData.append("info", postInfo.trim());

      if (postImageFile) {
        formData.append("image", postImageFile);
      }

      const response = await fetch("http://127.0.0.1:8000/api/posts/", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      let responseData: unknown = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      console.log(`📥 پاسخ دریافت شد از سرور (کد ${response.status}):`, responseData);

      if (response.ok) {
        setFeedback({
          type: "success",
          status: response.status,
          message: "پست با موفقیت با متد POST در سرور ثبت شد.",
          details:
            typeof responseData === "object"
              ? JSON.stringify(responseData, null, 2)
              : String(responseData),
        });

        // ریست کردن فرم
        setPostTitle("");
        setPostInfo("");
        setPostImage(null);
        setPostImageFile(null);
        setPostImageName("");

        // در صورت باز بودن لیست پست‌ها، لیست را دوباره بروزرسانی می‌کنیم
        if (postsFetched) {
          handleFetchPosts();
        }
      } else {
        const detailMsg =
          typeof responseData === "object" && responseData !== null
            ? JSON.stringify(responseData, null, 2)
            : responseText || response.statusText;

        setFeedback({
          type: "error",
          status: response.status,
          message: `خطای سرور با کد ${response.status}`,
          details: detailMsg,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ خطای درخواست POST:", error);
      setFeedback({
        type: "error",
        message: "خطا در برقراری ارتباط با سرور (بررسی کنید بک‌اند روی پورت ۸۰۰۰ فعال باشد و خطای CORS رخ ندهد)",
        details: error?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دریافت تمامی پست‌ها (GET)
  const handleFetchPosts = async () => {
    setIsFetchingPosts(true);
    setPostsError(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/posts/", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`خطای سرور: کد وضعیت ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
      }
      setPostsFetched(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error fetching posts:", error);
      setPostsError(
        error?.message ||
          "خطا در دریافت پست‌ها. لطفاً بررسی کنید سرور در آدرس http://127.0.0.1:8000 در حال اجرا باشد."
      );
    } finally {
      setIsFetchingPosts(false);
    }
  };

  // حذف پست (DELETE) به آدرس http://127.0.0.1:8000/api/posts/:id/
  const handleDeletePost = async (id: number | string) => {
    if (!window.confirm("آیا از حذف این پست اطمینان دارید؟")) {
      return;
    }

    setDeletingId(id);
    setPostsError(null);

    console.log(`🗑️ در حال ارسال درخواست DELETE به http://127.0.0.1:8000/api/posts/${id}/`);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/posts/${id}/`, {
        method: "DELETE",
      });

      console.log(`📥 پاسخ حذف از سرور (کد وضعیت ${response.status})`);

      if (response.ok) {
        // حذف پست از استیت لوکال
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        const responseText = await response.text();
        let responseData: unknown = null;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        const detailMsg =
          typeof responseData === "object" && responseData !== null
            ? JSON.stringify(responseData)
            : responseText || response.statusText;

        setPostsError(`خطا در حذف پست #${id} (کد ${response.status}): ${detailMsg}`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ خطای درخواست DELETE:", error);
      setPostsError(`خطا در ارتباط با سرور هنگام حذف پست #${id}: ${error?.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // کمکی برای اصلاح آدرس تصویر در صورت نسبی بودن
  const formatImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    return `http://127.0.0.1:8000${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  };

  // باز کردن مودال ویرایش برای یک پست خاص
  const handleOpenEdit = (post: PostItem) => {
    setEditingPost(post);
    setEditTitle(post.title || "");
    setEditInfo(post.info || "");
    setEditImageFile(null);
    setEditImagePreview(formatImageUrl(post.image));
    setUpdateFeedback(null);
  };

  // بستن مودال ویرایش
  const handleCloseEdit = () => {
    if (isUpdating) return;
    setEditingPost(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setUpdateFeedback(null);
  };

  // انتخاب تصویر جدید در ویرایش
  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ارسال درخواست آپدیت با متد PATCH به http://127.0.0.1:8000/api/posts/:id/
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    if (!editTitle.trim()) {
      setUpdateFeedback({
        type: "error",
        message: "لطفاً عنوان پست را وارد کنید.",
      });
      return;
    }

    setIsUpdating(true);
    setUpdateFeedback(null);

    const targetUrl = `http://127.0.0.1:8000/api/posts/${editingPost.id}/`;
    console.log(`🔄 در حال ارسال درخواست PATCH به ${targetUrl} با داده‌ها:`, {
      id: editingPost.id,
      title: editTitle.trim(),
      info: editInfo.trim(),
      newImage: editImageFile?.name || null,
    });

    try {
      const formData = new FormData();
      formData.append("title", editTitle.trim());
      formData.append("info", editInfo.trim());

      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      const response = await fetch(targetUrl, {
        method: "PATCH",
        body: formData,
      });

      const responseText = await response.text();
      let responseData: unknown = null;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      console.log(`📥 پاسخ آپدیت دریافت شد (کد وضعیت ${response.status}):`, responseData);

      if (response.ok) {
        const updatedData =
          typeof responseData === "object" && responseData !== null
            ? (responseData as Partial<PostItem>)
            : {};

        const updatedPost: PostItem = {
          ...editingPost,
          title: editTitle.trim(),
          info: editInfo.trim(),
          ...updatedData,
        };

        // بروزرسانی آیتم در استیت لوکال
        setPosts((prev) =>
          prev.map((p) => (p.id === editingPost.id ? updatedPost : p))
        );

        setUpdateFeedback({
          type: "success",
          status: response.status,
          message: `پست #${editingPost.id} با موفقیت آپدیت شد.`,
        });

        setTimeout(() => {
          handleCloseEdit();
        }, 800);
      } else {
        const detailMsg =
          typeof responseData === "object" && responseData !== null
            ? JSON.stringify(responseData, null, 2)
            : responseText || response.statusText;

        setUpdateFeedback({
          type: "error",
          status: response.status,
          message: `خطای سرور با کد ${response.status}`,
          details: detailMsg,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("❌ خطای درخواست آپدیت:", error);
      setUpdateFeedback({
        type: "error",
        message: "خطا در برقراری ارتباط با سرور",
        details: error?.message || "بررسی کنید بک‌اند در حال اجرا و مجاز به CORS باشد.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Box
        dir="rtl"
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 5,
          px: 2,
          bgcolor: "background.default",
        }}
      >
        {/* ۱. باکس ساخت پست جدید */}
        <Card
          sx={{
            width: "100%",
            maxWidth: 580,
            borderRadius: 4,
            border: "1px solid",
            borderColor: "rgba(226, 232, 240, 0.9)",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
            overflow: "hidden",
            bgcolor: "background.paper",
            mb: 4,
          }}
        >
          {/* هدر باکس ساخت پست */}
          <Box
            sx={{
              px: 3,
              pt: 3,
              pb: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.15rem" }}>
              ساخت پست جدید
            </Typography>
            <Typography variant="caption" color="text.secondary">
              تصویر، عنوان و متن پست خود را وارد کنید
            </Typography>
          </Box>

          <CardContent sx={{ p: 3 }}>
            <Box
              component="form"
              onSubmit={handleCreatePost}
              sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              {/* پیام وضعیت پاسخ API */}
              {feedback && (
                <Alert
                  severity={feedback.type}
                  onClose={() => setFeedback(null)}
                  sx={{ borderRadius: 2.5 }}
                >
                  <AlertTitle sx={{ fontWeight: 800 }}>
                    {feedback.status ? `کد ${feedback.status}: ` : ""}
                    {feedback.message}
                  </AlertTitle>
                  {feedback.details && (
                    <Box
                      component="pre"
                      dir="ltr"
                      sx={{
                        m: 0,
                        mt: 1,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "rgba(0, 0, 0, 0.05)",
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        maxHeight: 140,
                        overflowY: "auto",
                      }}
                    >
                      {feedback.details}
                    </Box>
                  )}
                </Alert>
              )}

              {/* انتخاب عکس (اولین فیلد) */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 700, color: "text.primary" }}
                >
                  تصویر پست
                </Typography>

                {!postImage ? (
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    disabled={isLoading}
                    sx={{
                      minHeight: 140,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      borderStyle: "dashed",
                      borderWidth: 1.5,
                      borderColor: "rgba(148, 163, 184, 0.45)",
                      bgcolor: "rgba(248, 250, 252, 0.8)",
                      borderRadius: 3,
                      p: 2,
                      textTransform: "none",
                      color: "text.secondary",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "primary.light",
                        color: "primary.dark",
                      },
                    }}
                  >
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "rgba(148, 163, 184, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                      }}
                    >
                      📷
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      انتخاب یا بارگذاری تصویر پست
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      فرمت‌های مجاز: JPG، PNG یا WEBP
                    </Typography>
                  </Button>
                ) : (
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 3,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "black",
                      maxHeight: 220,
                    }}
                  >
                    <Box
                      component="img"
                      src={postImage}
                      alt="پیش‌نمایش تصویر پست"
                      sx={{
                        width: "100%",
                        height: 200,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        right: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 2,
                        bgcolor: "rgba(15, 23, 42, 0.75)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#FFFFFF",
                          maxWidth: 220,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {postImageName || "تصویر انتخاب‌شده"}
                      </Typography>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          component="label"
                          disabled={isLoading}
                          sx={{
                            color: "#FFFFFF",
                            fontSize: "0.75rem",
                            py: 0.25,
                            px: 1,
                            minWidth: 0,
                          }}
                        >
                          تغییر
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={isLoading}
                          onClick={handleRemoveImage}
                          sx={{
                            fontSize: "0.75rem",
                            py: 0.25,
                            px: 1,
                            minWidth: 0,
                          }}
                        >
                          حذف
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* عنوان پست */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 700, color: "text.primary" }}
                >
                  تایتل (عنوان پست) *
                </Typography>
                <TextField
                  placeholder="عنوان پست را وارد کنید..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  fullWidth
                  required
                  disabled={isLoading}
                  size="medium"
                  slotProps={{
                    input: {
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                />
              </Box>

              {/* متن و توضیحات پست */}
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 1, fontWeight: 700, color: "text.primary" }}
                >
                  اینفو (متن و توضیحات)
                </Typography>
                <TextField
                  placeholder="توضیحات و جزییات پست را وارد کنید..."
                  value={postInfo}
                  onChange={(e) => setPostInfo(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                  disabled={isLoading}
                  slotProps={{
                    input: {
                      sx: { borderRadius: 2.5 },
                    },
                  }}
                />
              </Box>

              {/* دکمه ارسال پست */}
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                sx={{
                  mt: 1,
                  py: 1.4,
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  borderRadius: 2.5,
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                }}
                fullWidth
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    <span>در حال ارسال...</span>
                  </Box>
                ) : (
                  "ساخت پست"
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* ۲. بخش نمایش تمامی پست‌ها (درخواست GET به API) */}
        <Box sx={{ width: "100%", maxWidth: 860, mt: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <Button
              variant="outlined"
              size="large"
              onClick={handleFetchPosts}
              disabled={isFetchingPosts}
              sx={{
                py: 1.5,
                px: 4,
                fontWeight: 800,
                fontSize: "1rem",
                borderRadius: 3,
                borderWidth: 2,
                bgcolor: "background.paper",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderWidth: 2,
                  bgcolor: "primary.light",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {isFetchingPosts ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CircularProgress size={22} color="primary" />
                  <span>در حال دریافت پست‌ها...</span>
                </Box>
              ) : (
                "نمایش تمامی پست‌ها"
              )}
            </Button>
          </Box>

          {/* خطای دریافت پست‌ها */}
          {postsError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
              <AlertTitle sx={{ fontWeight: 800 }}>خطا در دریافت اطلاعات</AlertTitle>
              {postsError}
            </Alert>
          )}

          {/* لیست پست‌ها */}
          {postsFetched && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                  px: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  لیست پست‌های سرور
                </Typography>
                <Chip
                  label={`${posts.length} پست`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>

              {posts.length === 0 ? (
                <Card
                  variant="outlined"
                  sx={{
                    p: 4,
                    textAlign: "center",
                    borderRadius: 3,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    هیچ پستی در سرور یافت نشد.
                  </Typography>
                </Card>
              ) : (
                <Grid container spacing={2.5}>
                  {posts.map((item) => {
                    const imgUrl = formatImageUrl(item.image);
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            borderRadius: 3,
                            overflow: "hidden",
                            bgcolor: "background.paper",
                            transition: "transform 0.2s ease, box-shadow 0.2s ease",
                            "&:hover": {
                              transform: "translateY(-3px)",
                              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.06)",
                            },
                          }}
                        >
                          {imgUrl && (
                            <CardMedia
                              component="img"
                              height="180"
                              image={imgUrl}
                              alt={item.title}
                              sx={{
                                objectFit: "cover",
                                bgcolor: "rgba(0, 0, 0, 0.04)",
                              }}
                            />
                          )}

                          <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                mb: 1,
                                color: "text.primary",
                                lineHeight: 1.4,
                              }}
                            >
                              {item.title}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                lineHeight: 1.6,
                              }}
                            >
                              {item.info}
                            </Typography>
                          </CardContent>

                          <Box sx={{ px: 2.5, pb: 2, pt: 1, mt: "auto" }}>
                            <Divider sx={{ mb: 1.5 }} />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 600 }}
                              >
                                شناسه: #{item.id}
                              </Typography>

                              <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => handleOpenEdit(item)}
                                  sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    px: 1.5,
                                    py: 0.4,
                                    minWidth: 55,
                                    borderColor: "primary.main",
                                    "&:hover": {
                                      bgcolor: "primary.light",
                                    },
                                  }}
                                >
                                  آپدیت
                                </Button>

                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={deletingId === item.id}
                                  onClick={() => handleDeletePost(item.id)}
                                  sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    px: 1.5,
                                    py: 0.4,
                                    minWidth: 55,
                                    borderColor: "rgba(239, 68, 68, 0.4)",
                                    "&:hover": {
                                      bgcolor: "rgba(254, 242, 242, 1)",
                                      borderColor: "error.main",
                                    },
                                  }}
                                >
                                  {deletingId === item.id ? (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                      <CircularProgress size={13} color="inherit" />
                                      <span>حذف...</span>
                                    </Box>
                                  ) : (
                                    "حذف"
                                  )}
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          )}
        </Box>

        {/* ۳. مودال آپدیت پست (ارسال PUT / PATCH به http://127.0.0.1:8000/api/posts/:id/) */}
        <Dialog
          open={Boolean(editingPost)}
          onClose={handleCloseEdit}
          fullWidth
          maxWidth="sm"
          dir="rtl"
          slotProps={{
            paper: {
              sx: { borderRadius: 3.5, p: 1 },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                آپدیت پست #{editingPost?.id}
              </Typography>
              <Chip
                size="small"
                label={`http://127.0.0.1:8000/api/posts/${editingPost?.id}/`}
                sx={{
                  direction: "ltr",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  bgcolor: "background.default",
                }}
              />
            </Box>
          </DialogTitle>

          <Box component="form" onSubmit={handleUpdatePost}>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
              {/* پیام وضعیت پاسخ آپدیت */}
              {updateFeedback && (
                <Alert severity={updateFeedback.type} sx={{ borderRadius: 2 }}>
                  <AlertTitle sx={{ fontWeight: 800 }}>
                    {updateFeedback.status ? `کد ${updateFeedback.status}: ` : ""}
                    {updateFeedback.message}
                  </AlertTitle>
                  {updateFeedback.details && (
                    <Box
                      component="pre"
                      dir="ltr"
                      sx={{
                        m: 0,
                        mt: 0.5,
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        maxHeight: 100,
                        overflowY: "auto",
                      }}
                    >
                      {updateFeedback.details}
                    </Box>
                  )}
                </Alert>
              )}

              {/* تصویر پست */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                  تصویر پست
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {editImagePreview && (
                    <Box
                      component="img"
                      src={editImagePreview}
                      alt="پیش‌نمایش تصویر"
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        objectFit: "cover",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    disabled={isUpdating}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {editImageFile ? "تغییر مجدد فایل" : "انتخاب تصویر جدید"}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleEditImageChange}
                    />
                  </Button>
                </Box>
              </Box>

              {/* عنوان پست */}
              <TextField
                label="تایتل (عنوان پست) *"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                fullWidth
                required
                disabled={isUpdating}
                slotProps={{
                  input: {
                    sx: { borderRadius: 2 },
                  },
                }}
              />

              {/* متن و توضیحات پست */}
              <TextField
                label="اینفو (متن و توضیحات)"
                value={editInfo}
                onChange={(e) => setEditInfo(e.target.value)}
                multiline
                rows={4}
                fullWidth
                disabled={isUpdating}
                slotProps={{
                  input: {
                    sx: { borderRadius: 2 },
                  },
                }}
              />
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
              <Button
                onClick={handleCloseEdit}
                disabled={isUpdating}
                color="inherit"
                sx={{ fontWeight: 700 }}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isUpdating}
                sx={{
                  fontWeight: 800,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                }}
              >
                {isUpdating ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} color="inherit" />
                    <span>در حال ارسال...</span>
                  </Box>
                ) : (
                  "ارسال آپدیت"
                )}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
