/**
 * Cloudflare Worker - 音乐网 (无冲突安全稳定版)
 */

export default {
  async fetch(request, env) {
    const siteName = env.SITE_NAME || "OTC音乐网";
    const proxy    = env.PROXY    || "https://proxy.api.030101.xyz/";
    const sitePassword = env.SITE_PASSWORD || "";

    const url = new URL(request.url);

    // 登录校验接口
    if (url.pathname === "/api/verify-password" && request.method === "POST") {
      try {
        const body = await request.json();
        if (sitePassword && body.password === sitePassword) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({ success: false, message: "密码错误" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: "无效请求" }), { status: 400 });
      }
    }

    // 获取原始 HTML 模板
    let html = getHTML();

    // 在后端进行安全的字符串替换，避免任何 $ 符号冲突
    html = html.replaceAll("{{WORKER_SITE_NAME}}", siteName);
    html = html.replaceAll("{{WORKER_PROXY}}", proxy);
    html = html.replaceAll("{{WORKER_REQUIRE_LOGIN}}", String(!!sitePassword));

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-cache",
      },
    });
  },
};

// 将所有变量从外部动态注入，函数内部纯洁干净，杜绝 1101 报错
function getHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>{{WORKER_SITE_NAME}}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"><\/script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        body {
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            min-height: 100vh;
            position: relative;
        }
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: radial-gradient(circle at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(236,72,153,0.1) 0%, transparent 60%);
            pointer-events: none;
            z-index: 0;
        }
        .glass-modern {
            background: rgba(15,12,41,0.6);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border-radius: 1.5rem;
        }
        .glass-card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.08);
            transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
            border-radius: 1.5rem;
        }
        .glass-card:hover {
            border-color: rgba(168,85,247,0.3);
            box-shadow: 0 8px 32px rgba(168,85,247,0.1);
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        .rotate-slow { animation: spin 20s linear infinite; }
        .song-list::-webkit-scrollbar { width: 4px; }
        .song-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .song-list::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.5); border-radius: 10px; }
        .song-list::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.8); }
        .loader {
            width: 40px; height: 40px;
            border: 3px solid rgba(168,85,247,0.3);
            border-top-color: #a855f7;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        .search-input:focus {
            box-shadow: 0 0 0 3px rgba(168,85,247,0.2);
            transform: scale(1.01);
        }
        .quality-btn {
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            font-weight: 600;
            transition: all 0.3s;
            font-size: 0.85rem;
        }
        @media (max-width: 768px) { .quality-btn { padding: 0.4rem 0.8rem; font-size: 0.75rem; } }
        .quality-btn-active {
            background: linear-gradient(135deg, #a855f7, #ec489a);
            box-shadow: 0 4px 15px rgba(168,85,247,0.4);
            color: white;
        }
        .song-item {
            transition: all 0.2s ease;
            cursor: pointer;
            border-radius: 0.75rem;
            margin: 0 0.5rem;
        }
        .song-item:hover {
            background: linear-gradient(90deg, rgba(168,85,247,0.2), rgba(236,72,153,0.1));
            transform: translateX(4px);
        }
        .song-playing {
            background: linear-gradient(90deg, rgba(168,85,247,0.3), rgba(236,72,153,0.15));
            border-left: 3px solid #a855f7;
        }
        .fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
        .fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 20px); }
        .main-content { padding-top: 40px; }
        .title-section { margin-top: 20px; margin-bottom: 40px; }
        .main-title { font-size: 4rem; letter-spacing: -0.02em; }
        @media (max-width: 768px) {
            .main-title { font-size: 2.8rem; }
            .main-content { padding-top: 30px; }
            .title-section { margin-top: 15px; margin-bottom: 30px; }
        }
        .search-input { font-size: 1.1rem; }
        .song-name { font-size: 1.1rem; }
        .artist-name { font-size: 0.9rem; }
        .quick-tag { font-size: 0.9rem; padding: 0.5rem 1rem; }
        .result-count { font-size: 0.9rem; }
        .now-playing-title { font-size: 2rem; }
        @media (max-width: 768px) { .now-playing-title { font-size: 1.5rem; } }
        .download-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            transition: all 0.3s;
        }
        .download-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 15px rgba(16,185,129,0.4);
        }
        .custom-player { margin-top: 1rem; width: 100%; }
        .control-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 1rem;
        }
        @media (max-width: 768px) { .control-bar { gap: 1.5rem; } }
        .control-btn {
            width: 44px; height: 44px;
            border-radius: 50%;
            background: rgba(168,85,247,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            color: white;
            font-size: 20px;
        }
        @media (max-width: 768px) { .control-btn { width: 48px; height: 48px; font-size: 22px; } }
        .control-btn:hover { background: rgba(168,85,247,0.5); transform: scale(1.05); }
        .control-btn-play {
            background: linear-gradient(135deg, #a855f7, #ec489a);
            width: 56px; height: 56px;
        }
        @media (max-width: 768px) { .control-btn-play { width: 64px; height: 64px; font-size: 28px; } }
        .progress-section { display: flex; align-items: center; gap: 0.75rem; }
        .progress-track {
            flex: 1; height: 6px;
            background: rgba(255,255,255,0.2);
            border-radius: 6px;
            cursor: pointer;
            position: relative;
        }
        @media (max-width: 768px) { .progress-track { height: 8px; } }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #a855f7, #ec489a);
            border-radius: 6px;
            width: 0%;
            position: relative;
        }
        .progress-thumb {
            width: 14px; height: 14px;
            background: white;
            border-radius: 50%;
            position: absolute;
            right: -7px; top: -4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        @media (max-width: 768px) { .progress-thumb { width: 18px; height: 18px; right: -9px; top: -5px; } }
        .time-text {
            font-size: 12px;
            font-family: monospace;
            opacity: 0.7;
            min-width: 70px;
            text-align: right;
        }
        .time-text-left { min-width: 50px; text-align: left; }
        @media (max-width: 768px) {
            .time-text { font-size: 13px; min-width: 80px; }
            .time-text-left { min-width: 55px; }
        }
        audio { display: none; }
    </style>
</head>
<body>
    <div id="app" class="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-8 main-content">

        <!-- 登录框 -->
        <div v-if="requireLoginSetting && !isLoggedIn" class="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <div class="glass-modern p-6 md:p-8 max-w-md w-full text-center shadow-2xl">
                <h3 class="text-2xl font-bold text-white mb-2">🔐 访问受限</h3>
                <p class="text-white/60 text-sm mb-6">请输入密码登录以开始享受尊享音源</p>
                <input v-model="loginPassword" type="password" @keyup.enter="handleLogin" placeholder="请输入站点密码..." 
                    class="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 outline-none focus:border-purple-500 text-center text-lg mb-4">
                <button @click="handleLogin" 
                    class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg">
                    验证并登录
                </button>
            </div>
        </div>

        <!-- 标题区 -->
        <div class="text-center title-section flex flex-col items-center justify-center">
            <div class="inline-block mb-4">
                <div class="relative">
                    <div class="absolute inset-0 blur-2xl bg-purple-600/30 rounded-full"></div>
                    <h1 class="relative main-title font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                        {{WORKER_SITE_NAME}}
                    </h1>
                </div>
            </div>
            <p class="text-white/60 text-base mb-2">QQ音乐爬取 · 无损母带级 · 沉浸聆听</p>
            <button v-if="isLoggedIn && requireLoginSetting" @click="handleLogout" class="text-xs text-white/40 hover:text-red-400 underline transition">退出登录</button>
        </div>

        <!-- 功能导航：搜索 与 我的收藏 -->
        <div class="flex border-b border-white/10 mb-6 gap-2">
            <button @click="activeTab = 'search'" class="px-5 py-3 text-base font-semibold transition-all" :class="activeTab === 'search' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-white/60 hover:text-white'">🔍 音乐搜索</button>
            <button @click="activeTab = 'favorites'" class="px-5 py-3 text-base font-semibold transition-all flex items-center gap-1" :class="activeTab === 'favorites' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-white/60 hover:text-white'">❤️ 我的收藏 <span class="text-xs bg-pink-500/20 px-2 py-0.5 rounded-full text-pink-300">{{ favorites.length }}</span></button>
        </div>

        <!-- 搜索视图 -->
        <div v-show="activeTab === 'search'">
            <!-- 音质选择 -->
            <div class="glass-modern rounded-2xl p-5 mb-6">
                <div class="flex items-center gap-2 mb-4">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span class="text-white/80 text-sm font-medium">🎵 音质选择</span>
                </div>
                <div class="flex flex-wrap gap-3">
                    <button v-for="q in qualities" :key="q.value"
                        @click="currentQuality = q.value; if(currentSong) refreshPlay()"
                        class="quality-btn"
                        :class="currentQuality === q.value ? 'quality-btn-active text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20'">
                        {{ q.label }}
                    </button>
                </div>
            </div>

            <!-- 搜索框 -->
            <div class="glass-modern rounded-2xl p-6 md:p-7 mb-6">
                <div class="flex flex-col md:flex-row gap-4 mb-5">
                    <div class="flex-1 relative">
                        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 text-lg">🔍</div>
                        <input v-model="keyword" @keyup.enter="searchMusic" type="text"
                            placeholder="输入歌名、歌手，如「晴天」「周杰伦」「稻香」..."
                            class="search-input w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 outline-none transition-all focus:border-purple-500 text-base">
                    </div>
                    <button @click="searchMusic" :disabled="loading"
                        class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[130px] shadow-lg hover:shadow-purple-500/25 text-base">
                        <span v-if="loading" class="loader w-5 h-5 border-2"></span>
                        <span>{{ loading ? '搜索中' : '🎵 搜索音乐' }}</span>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2.5">
                    <span v-for="tag in quickTags" :key="tag" @click="keyword = tag; searchMusic()"
                        class="quick-tag px-4 py-2 rounded-full bg-white/10 text-white/80 hover:bg-purple-500/40 hover:text-white cursor-pointer transition-all duration-200 backdrop-blur-sm font-medium">
                        🎧 {{ tag }}
                    </span>
                </div>
            </div>
        </div>

        <!-- 当前播放 -->
        <div v-if="currentSong" class="glass-card rounded-2xl p-6 md:p-7 mb-6 transition-all duration-500">
            <div class="flex flex-col md:flex-row items-center gap-6">
                <div class="relative">
                    <img :src="currentSong.artwork" class="w-36 h-36 md:w-40 md:h-40 rounded-2xl shadow-2xl object-cover rotate-slow"
                        @error="currentSong.artwork = defaultCover">
                    <div class="absolute -bottom-2 -right-2 w-9 h-9 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-white text-sm">👑</span>
                    </div>
                </div>
                <div class="flex-1 text-center md:text-left w-full">
                    <div class="mb-2 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <span class="inline-block px-3 py-1 rounded-full text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-2 font-medium shadow-lg">SVIP音源</span>
                            <h2 class="now-playing-title font-bold text-white mb-1 leading-tight">{{ currentSong.title }}</h2>
                            <p class="text-white/70 text-base">{{ currentSong.artist }}</p>
                        </div>
                        <button @click="toggleFavorite(currentSong)" class="self-center md:self-start px-4 py-2 rounded-xl text-sm font-semibold transition border flex items-center gap-1.5"
                            :class="isFavorite(currentSong.id) ? 'bg-pink-500/20 text-pink-400 border-pink-500/40 hover:bg-pink-500/30' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'">
                            <span>{{ isFavorite(currentSong.id) ? '❤️ 已收藏' : '🤍 收藏' }}</span>
                        </button>
                    </div>
                    <div class="custom-player">
                        <div class="control-bar">
                            <div class="control-btn" @click="playPrev">⏮</div>
                            <div class="control-btn control-btn-play" @click="togglePlay">{{ isPlaying ? '⏸' : '▶' }}</div>
                            <div class="control-btn" @click="playNext">⏭</div>
                        </div>
                        <div class="progress-section">
                            <span class="time-text time-text-left">{{ currentTime }}</span>
                            <div class="progress-track" @click="seek">
                                <div class="progress-fill" :style="{ width: progressPercent + '%' }">
                                    <div class="progress-thumb"></div>
                                </div>
                            </div>
                            <span class="time-text">{{ duration }}</span>
                        </div>
                    </div>
                    <audio ref="audioPlayer" :src="currentPlayUrl"
                        @loadedmetadata="onLoaded" @timeupdate="onTimeUpdate" @ended="onEnded"></audio>
                    <div class="flex gap-3 mt-4">
                        <button @click="downloadSong" :disabled="downloading"
                            class="download-btn flex-1 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                            <span v-if="downloading" class="loader w-4 h-4 border-2"></span>
                            <span v-else>⬇️ 下载 {{ currentSong.title }}</span>
                        </button>
                    </div>
                    <div v-if="playError" class="text-amber-300 text-sm mt-2 flex items-center justify-center md:justify-start gap-2">
                        <span>⚠️ {{ playError }}</span>
                        <button @click="refreshPlay" class="text-purple-300 underline text-sm">重试</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 列表展现区 (搜索结果) -->
        <div v-show="activeTab === 'search'" class="glass-modern rounded-2xl overflow-hidden">
            <div class="px-6 py-5 border-b border-white/10 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🎧</span>
                    <span class="text-white font-semibold text-lg">搜索结果</span>
                    <span v-if="songs.length" class="result-count px-2.5 py-0.5 rounded-full text-sm bg-purple-500/30 text-purple-200 font-medium">{{ songs.length }}首</span>
                </div>
                <div v-if="songs.length" class="text-white/50 text-sm">点击歌曲即可播放</div>
            </div>
            <div v-if="loading && !songs.length" class="p-16 text-center">
                <div class="loader mx-auto mb-4"></div>
                <p class="text-white/60 text-base">正在寻找音乐...</p>
            </div>
            <div v-else-if="!songs.length && !loading" class="p-16 text-center">
                <div class="text-7xl mb-4 opacity-50">🎼</div>
                <p class="text-white/60 text-lg">输入关键词，开始音乐之旅</p>
                <p class="text-white/40 text-base mt-2">试试「晴天」「稻香」「夜曲」</p>
            </div>
            <div v-else class="divide-y divide-white/10 max-h-[550px] overflow-y-auto song-list">
                <div v-for="(song, idx) in songs" :key="song.id" @click="playSong(song)"
                    class="song-item p-4 flex items-center gap-4 cursor-pointer transition-all"
                    :class="currentSong && currentSong.id === song.id ? 'song-playing' : ''">
                    <div class="text-white/50 w-10 text-center font-mono text-base font-medium">{{ String(idx+1).padStart(2,'0') }}</div>
                    <div class="relative">
                        <img :src="song.artwork" class="w-14 h-14 rounded-lg object-cover shadow-md" @error="song.artwork = defaultCover">
                        <div v-if="currentSong && currentSong.id === song.id"
                            class="absolute inset-0 bg-gradient-to-r from-purple-600/80 to-pink-600/80 rounded-lg flex items-center justify-center">
                            <span class="text-white text-sm font-bold">▶</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="song-name text-white font-semibold truncate">{{ song.title }}</div>
                        <div class="artist-name text-white/50 text-sm truncate mt-0.5">{{ song.artist }}</div>
                    </div>
                    <div class="text-white/40 text-sm hidden sm:block">{{ song.duration }}</div>
                </div>
            </div>
        </div>

        <!-- 收藏夹视图 -->
        <div v-show="activeTab === 'favorites'" class="glass-modern rounded-2xl overflow-hidden">
            <div class="px-6 py-5 border-b border-white/10 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">💖</span>
                    <span class="text-white font-semibold text-lg">专属收藏夹</span>
                    <span class="result-count px-2.5 py-0.5 rounded-full text-sm bg-pink-500/30 text-pink-200 font-medium">{{ favorites.length }}首</span>
                </div>
                <div v-if="favorites.length" class="text-white/50 text-sm">数据保存在本地浏览器</div>
            </div>
            <div v-if="!favorites.length" class="p-16 text-center">
                <div class="text-7xl mb-4 opacity-50">💔</div>
                <p class="text-white/60 text-lg">你还没有收藏过任何歌曲</p>
                <p class="text-white/40 text-base mt-2">在播放心仪歌曲时，点击“收藏”按钮即可添加</p>
            </div>
            <div v-else class="divide-y divide-white/10 max-h-[550px] overflow-y-auto song-list">
                <div v-for="(song, idx) in favorites" :key="song.id" @click="playFavoriteSong(song)"
                    class="song-item p-4 flex items-center gap-4 cursor-pointer transition-all"
                    :class="currentSong && currentSong.id === song.id ? 'song-playing' : ''">
                    <div class="text-white/50 w-10 text-center font-mono text-base font-medium">{{ String(idx+1).padStart(2,'0') }}</div>
                    <div class="relative">
                        <img :src="song.artwork" class="w-14 h-14 rounded-lg object-cover shadow-md" @error="song.artwork = defaultCover">
                        <div v-if="currentSong && currentSong.id === song.id"
                            class="absolute inset-0 bg-gradient-to-r from-purple-600/80 to-pink-600/80 rounded-lg flex items-center justify-center">
                            <span class="text-white text-sm font-bold">▶</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="song-name text-white font-semibold truncate">{{ song.title }}</div>
                        <div class="artist-name text-white/50 text-sm truncate mt-0.5">{{ song.artist }}</div>
                    </div>
                    <button @click.stop="toggleFavorite(song)" class="text-white/40 hover:text-red-400 px-2 py-1 text-base transition">🗑️</button>
                </div>
            </div>
        </div>

        <div class="text-center mt-6 text-white/30 text-sm">
            🎵 {{WORKER_SITE_NAME}} · 腾讯SVIP尊享音源 · 母带级无损音质 🎵
        </div>

        <transition name="fade">
            <div v-if="message"
                class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm shadow-2xl z-50 flex items-center gap-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                {{ message }}
            </div>
        </transition>
    </div>

    <script>
        const { createApp, ref, onMounted } = Vue;

        const PROXY = '{{WORKER_PROXY}}';
        const requireLoginSetting = {{WORKER_REQUIRE_LOGIN}};

        const qualities = [
            { value: 'low',      label: '标准(128k)'  },
            { value: 'standard', label: '高品质(320k)' },
            { value: 'high',     label: '无损(flac)'  },
        ];

        const defaultCover = 'https://y.gtimg.cn/music/photo_new/T002R300x300M000000MkMni19ClKG.jpg';

        const searchHeaders = {
            referer: "https://y.qq.com",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Cookie: "uin=",
        };

        function formatMusicItem(_) {
            const albummid = _.album?.mid;
            return {
                id:       _.id || _.songid,
                songmid:  _.mid || _.songmid,
                title:    _.title || _.songname,
                artist:   _.singer?.map(s => s.name).join(", ") || "未知歌手",
                artwork:  albummid
                    ? 'https://y.gtimg.cn/music/photo_new/T002R800x800M000' + albummid + '.jpg'
                    : defaultCover,
                duration: _.interval
                    ? Math.floor(_.interval/60) + ':' + String(_.interval%60).padStart(2,'0')
                    : '03:30',
            };
        }

        async function searchMusicQuery(query, page) {
            const postData = {
                req_1: {
                    method: "DoSearchForQQMusicDesktop",
                    module: "music.search.SearchCgiService",
                    param: { num_per_page: 25, page_num: page, query, search_type: 0 },
                },
            };
            const res = await axios.post(
                PROXY + 'https://u.y.qq.com/cgi-bin/musicu.fcg',
                postData,
                { headers: searchHeaders, timeout: 15000 }
            );
            return (res.data?.req_1?.data?.body?.song?.list || []).map(formatMusicItem);
        }

        async function getPlayUrl(songmid, quality) {
            try {
                const levelMap = { low: 'standard', standard: 'exhigh', high: 'lossless' };
                const level = levelMap[quality] || 'exhigh';
                const url = 'https://music.haitangw.cc/music/qq_song_kw.php?id=' + songmid + '&level=' + level + '&type=json';
                const res = await axios.get(PROXY + url, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com' },
                    timeout: 15000,
                });
                return res.data?.data?.url || null;
            } catch (e) {
                console.error('获取播放链接错误:', e);
                return null;
            }
        }

        const urlCache = new Map();
        async function getCachedPlayUrl(songmid, quality) {
            const key = songmid + '_' + quality;
            if (urlCache.has(key)) return urlCache.get(key);
            const url = await getPlayUrl(songmid, quality);
            if (url) urlCache.set(key, url);
            return url;
        }

        createApp({
            setup() {
                const activeTab      = ref('search');
                const isLoggedIn     = ref(false);
                const loginPassword  = ref('');
                const favorites      = ref([]);

                const keyword        = ref('');
                const songs          = ref([]);
                const loading        = ref(false);
                const currentSong    = ref(null);
                const currentPlayUrl = ref('');
                const playError      = ref('');
                const message        = ref('');
                const downloading    = ref(false);
                const currentQuality = ref('standard');

                const audioPlayer     = ref(null);
                const isPlaying       = ref(false);
                const currentTime     = ref('00:00');
                const duration        = ref('00:00');
                const progressPercent = ref(0);

                const quickTags = ['晴天','搁浅','夜曲','傻笑','安静了','白色风车','告白气球','说好的幸福呢','起风了','寂寞烟火'];

                onMounted(() => {
                    if (localStorage.getItem('music_logged_in') === 'true') {
                        isLoggedIn.value = true;
                    }
                    const favs = localStorage.getItem('music_favorites');
                    if (favs) {
                        favorites.value = JSON.parse(favs);
                    }
                });

                const handleLogin = async () => {
                    if (!loginPassword.value.trim()) { showMsg('请输入密码'); return; }
                    try {
                        const res = await axios.post('/api/verify-password', { password: loginPassword.value });
                        if (res.data.success) {
                            isLoggedIn.value = true;
                            localStorage.setItem('music_logged_in', 'true');
                            showMsg('🎉 登录成功');
                        }
                    } catch (e) {
                        showMsg('❌ 密码错误，验证失败');
                    }
                };

                const handleLogout = () => {
                    isLoggedIn.value = false;
                    localStorage.removeItem('music_logged_in');
                    showMsg('已退出登录');
                };

                const isFavorite = (id) => favorites.value.some(s => s.id === id);
                const toggleFavorite = (song) => {
                    if (isFavorite(song.id)) {
                        favorites.value = favorites.value.filter(s => s.id !== song.id);
                        showMsg('💔 已移出收藏夹');
                    } else {
                        favorites.value.push(song);
                        showMsg('💖 已加入收藏夹');
                    }
                    localStorage.setItem('music_favorites', JSON.stringify(favorites.value));
                };

                const playFavoriteSong = (song) => {
                    playSong(song);
                };

                const showMsg = (msg) => {
                    message.value = msg;
                    setTimeout(() => message.value = '', 2000);
                };

                const formatTime = (s) => {
                    if (isNaN(s)) return '00:00';
                    const m = Math.floor(s / 60);
                    const sec = Math.floor(s % 60);
                    return m.toString().padStart(2,'0') + ':' + sec.toString().padStart(2,'0');
                };

                const onLoaded     = () => { if (audioPlayer.value) duration.value = formatTime(audioPlayer.value.duration); };
                const onTimeUpdate = () => {
                    if (!audioPlayer.value) return;
                    currentTime.value = formatTime(audioPlayer.value.currentTime);
                    const pct = (audioPlayer.value.currentTime / audioPlayer.value.duration) * 100;
                    progressPercent.value = isNaN(pct) ? 0 : pct;
                };
                const togglePlay = () => {
                    if (!audioPlayer.value) return;
                    isPlaying.value ? audioPlayer.value.pause() : audioPlayer.value.play();
                    isPlaying.value = !isPlaying.value;
                };
                const seek = (e) => {
                    if (!audioPlayer.value) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    audioPlayer.value.currentTime = ((e.clientX - rect.left) / rect.width) * audioPlayer.value.duration;
                };
                const onEnded  = () => { isPlaying.value = false; playNext(); };
                
                const getActiveList = () => {
                    return activeTab.value === 'favorites' ? favorites.value : songs.value;
                };

                const playPrev = () => {
                    if (!currentSong.value) return;
                    const list = getActiveList();
                    const i = list.findIndex(s => s.id === currentSong.value.id);
                    if (i > 0) playSong(list[i - 1]);
                };
                const playNext = () => {
                    if (!currentSong.value) return;
                    const list = getActiveList();
                    const i = list.findIndex(s => s.id === currentSong.value.id);
                    if (i < list.length - 1) playSong(list[i + 1]);
                };

                const searchMusic = async () => {
                    if (!keyword.value.trim()) { showMsg('💡 输入歌名或歌手再搜索吧'); return; }
                    loading.value = true;
                    songs.value   = [];
                    playError.value = '';
                    try {
                        const results = await searchMusicQuery(keyword.value, 1);
                        songs.value = results;
                        showMsg(results.length ? '✨ 找到 ' + results.length + ' 首歌曲' : '😢 未找到相关歌曲，试试其他关键词');
                    } catch (e) {
                        console.error('搜索错误:', e);
                        showMsg('搜索失败，请稍后重试');
                    } finally {
                        loading.value = false;
                    }
                };

                const playSong = async (song) => {
                    if (!song) return;
                    currentSong.value = song;
                    playError.value   = '';
                    showMsg('🎵 获取播放链接中: ' + song.title);
                    const url = await getCachedPlayUrl(song.songmid, currentQuality.value);
                    if (url) {
                        currentPlayUrl.value = url;
                        isPlaying.value = true;
                        showMsg('🎵 正在播放: ' + song.title);
                        setTimeout(() => audioPlayer.value?.play(), 100);
                    } else {
                        playError.value = '获取播放链接失败';
                        showMsg('⚠️ 获取播放链接失败');
                    }
                };

                const downloadSong = async () => {
                    if (!currentPlayUrl.value || !currentSong.value) { showMsg('⚠️ 没有可下载的歌曲'); return; }
                    downloading.value = true;
                    showMsg('⬇️ 正在下载: ' + currentSong.value.title + '...');
                    try {
                        const res  = await axios.get(PROXY + currentPlayUrl.value, { responseType: 'blob', timeout: 30000 });
                        const blob = new Blob([res.data], { type: 'audio/mpeg' });
                        const dlUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = dlUrl;
                        a.download = currentSong.value.title + ' - ' + currentSong.value.artist + '.mp3';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(dlUrl);
                        showMsg('✅ 下载完成: ' + currentSong.value.title);
                    } catch (e) {
                        console.error('下载失败:', e);
                        showMsg('❌ 下载失败，请重试');
                    } finally {
                        downloading.value = false;
                    }
                };

                const refreshPlay = () => { if (currentSong.value) playSong(currentSong.value); };

                return {
                    activeTab, isLoggedIn, loginPassword, favorites, requireLoginSetting,
                    handleLogin, handleLogout, isFavorite, toggleFavorite, playFavoriteSong,
                    keyword, songs, loading, currentSong, currentPlayUrl, playError, message, downloading,
                    currentQuality, qualities, defaultCover, quickTags, audioPlayer,
                    isPlaying, currentTime, duration, progressPercent,
                    searchMusic, playSong, refreshPlay, downloadSong,
                    onLoaded, onTimeUpdate, togglePlay, seek, onEnded, playPrev, playNext,
                };
            }
        }).mount('#app');
    <\/script>
</body>
</html>`;
}
