/**
 * 第三方统计与通用 head 脚本，按环境变量条件注入。
 * 百度统计：配置 NEXT_PUBLIC_BAIDU_ANALYTICS_ID 后全站加载 hm.js。
 * @author poetry
 */

/** 未配置时为空，不加载统计脚本；Vercel 等未配置时有默认值 */
const BAIDU_ID = process.env.NEXT_PUBLIC_BAIDU_ANALYTICS_ID ?? "4bdc02239b6fe6f4e90583308d9ed3cd";

export default function AnalyticsOrHeadScripts() {
  if (!BAIDU_ID || !BAIDU_ID.trim()) return null;

  const script = `var _hmt = _hmt || [];(function(){var hm = document.createElement("script");hm.src = "https://hm.baidu.com/hm.js?${BAIDU_ID.trim()}";var s = document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm, s);})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
