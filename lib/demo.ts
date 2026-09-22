export type DemoUser = {
  name: string;
  email: string;
  username: string;
  location: string;
  bio: string;
  interests: string[];
};

export const defaultDemoUser: DemoUser = {
  name: "BeeBuddy",
  email: "hello.beebuddy@gmail.com",
  username: "BeeNguyen",
  location: "Ho Chi Minh City, Vietnam",
  bio: "Looking for new connections and shared adventures.",
  interests: ["Backpack & Trek", "Foodie & Cafes", "Photography"],
};

const SESSION_KEY = "beebuddy-demo-session";
const USER_KEY = "beebuddy-demo-user";

export function saveDemoSession(user: Partial<DemoUser> = {}) {
  if (typeof window === "undefined") return;
  const current = readDemoUser();
  window.localStorage.setItem(SESSION_KEY, "active");
  window.localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...user }));
}

export function readDemoUser(): DemoUser {
  if (typeof window === "undefined") return defaultDemoUser;
  try {
    const stored = window.localStorage.getItem(USER_KEY);
    return stored ? { ...defaultDemoUser, ...JSON.parse(stored) } : defaultDemoUser;
  } catch {
    return defaultDemoUser;
  }
}

export function hasDemoSession() {
  return typeof window !== "undefined" && window.localStorage.getItem(SESSION_KEY) === "active";
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function saveDemoUser(user: DemoUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}
