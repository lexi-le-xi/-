import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "泸定 · 与时间赛跑",
  description: "将地理、历史与团队战术融为一体的飞夺泸定桥网页游戏。",
  openGraph: {
    title: "泸定 · 与时间赛跑",
    description: "桥在前方，时间在身后。体验急行军、战术协同与飞夺泸定桥。",
    type: "website",
    images: [{ url: "/og.png", width: 1747, height: 903, alt: "泸定 · 与时间赛跑" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "泸定 · 与时间赛跑",
    description: "一款将地理、历史与团队战术融为一体的网页游戏。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
