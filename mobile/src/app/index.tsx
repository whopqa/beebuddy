import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL, FeedPost, postsApi } from "../lib/api";
import { useSession } from "../lib/session";

export default function Home() {
  const { user, accessToken } = useSession();
  const [feedState, setFeedState] = useState<{ token: string | null; posts: FeedPost[] }>({ token: null, posts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posts = feedState.token === accessToken ? feedState.posts : [];

  const loadFeed = useCallback(async () => {
    try {
      const feed = await postsApi.feed(accessToken ?? undefined);
      setFeedState({ token: accessToken, posts: feed.posts });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được bài viết.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    postsApi.feed(accessToken ?? undefined)
      .then((feed) => {
        if (active) { setFeedState({ token: accessToken, posts: feed.posts }); setError(null); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không tải được bài viết.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadFeed(); }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>CHÀO MỪNG ĐẾN BEEBUDDY</Text>
              <Text style={styles.title}>Cùng nhau kết nối, cùng nhau lớn lên.</Text>
              <Text style={styles.subtitle}>Khám phá câu chuyện từ cộng đồng BeeBuddy.</Text>
              <View style={styles.actions}>
                <Link href={user ? "/account" : "/sign-in"} asChild>
                  <Pressable style={styles.primaryButton}><Text style={styles.primaryText}>{user ? "Tài khoản" : "Đăng nhập"}</Text></Pressable>
                </Link>
                {!user && <Link href="/sign-up" asChild><Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Tạo tài khoản</Text></Pressable></Link>}
              </View>
            </View>
            <Text style={styles.sectionTitle}>Bài viết công khai</Text>
            {loading && <ActivityIndicator color="#D28B00" style={styles.indicator} />}
            {error && <View style={styles.messageBox}><Text style={styles.message}>{error}</Text><Pressable onPress={() => { setError(null); setLoading(true); void loadFeed(); }}><Text style={styles.retry}>Thử lại</Text></Pressable></View>}
          </View>
        }
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>Chưa có bài viết công khai.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Text style={styles.author}>{item.author.fullName}</Text>
            <Text style={styles.handle}>@{item.author.username} · {new Date(item.createdAt).toLocaleDateString("vi-VN")}</Text>
            <Text style={styles.content}>{item.content}</Text>
            <Text style={styles.counts}>{item.likesCount} lượt thích  ·  {item.commentsCount} bình luận</Text>
          </View>
        )}
        ListFooterComponent={!API_BASE_URL ? <Text style={styles.setup}>Thiết lập địa chỉ API trong mobile/.env.local để tải dữ liệu.</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF9E9" },
  list: { padding: 18, paddingBottom: 32, gap: 12 },
  hero: { backgroundColor: "#FFD34F", borderRadius: 24, padding: 24, marginBottom: 24 },
  eyebrow: { color: "#694400", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  title: { color: "#342409", fontSize: 28, fontWeight: "800", marginTop: 10, lineHeight: 36 },
  subtitle: { color: "#5C4723", fontSize: 15, marginTop: 8, lineHeight: 22 },
  actions: { flexDirection: "row", gap: 8, marginTop: 20, flexWrap: "wrap" },
  primaryButton: { backgroundColor: "#342409", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 },
  primaryText: { color: "white", fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: "#342409", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  secondaryText: { color: "#342409", fontWeight: "700" },
  sectionTitle: { color: "#342409", fontSize: 21, fontWeight: "800", marginBottom: 8 },
  indicator: { margin: 16 },
  post: { backgroundColor: "white", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#F0E5C8" },
  author: { color: "#342409", fontSize: 16, fontWeight: "700" },
  handle: { color: "#806C4E", fontSize: 12, marginTop: 3 },
  content: { color: "#342409", fontSize: 15, lineHeight: 23, marginTop: 14 },
  counts: { color: "#806C4E", fontSize: 12, marginTop: 16 },
  messageBox: { backgroundColor: "#FFF0DE", borderRadius: 12, padding: 16, marginBottom: 12 },
  message: { color: "#8F3E23" },
  retry: { color: "#714700", fontWeight: "700", marginTop: 8 },
  empty: { color: "#806C4E", textAlign: "center", padding: 22 },
  setup: { color: "#806C4E", textAlign: "center", padding: 14 },
});
