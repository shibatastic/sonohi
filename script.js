// script.js

// グローバル状態変数
let selectedYear = '';
let selectedMonth = '';
let selectedDay = '';
let dailyEvents = [];
let isLoading = false;
let error = '';
let sourceInfo = '';

// フォールバック用の絵文字
const DEFAULT_EMOJI = '📅';

// DOM要素への参照
const appRoot = document.getElementById('app-root');

/**
 * ヘルパー関数群
 */

// 年のリストを取得
const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= 1900; i--) {
        years.push(i);
    }
    return years;
};

// 月のリストを取得 (1月から12月)
const getMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
};

// 指定された年と月の最終日を取得（うるう年を考慮）
const getDaysInMonth = (year, month) => {
    if (!year || !month) return [];
    const date = new Date(parseInt(year), parseInt(month), 0);
    const numDays = date.getDate();
    return Array.from({ length: numDays }, (_, i) => i + 1);
};

/**
 * UIのレンダリングと更新を行うメイン関数
 */
const renderApp = () => {
    appRoot.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
            <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">
                📅その日のできごと
            </h1>

            <!-- 誕生日入力セクション (年、月、日のドロップダウン) -->
            <div class="mb-6 flex space-x-2">
                <!-- 年のドロップダウン -->
                <div class="flex-1">
                    <select
                        id="year-select"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    >
                        <option value="">年</option>
                        ${getYears().map(year => `<option value="${year}" ${selectedYear == year ? 'selected' : ''}>${year}</option>`).join('')}
                    </select>
                </div>

                <!-- 月のドロップダウン -->
                <div class="flex-1">
                    <select
                        id="month-select"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                        ${!selectedYear ? 'disabled' : ''}
                    >
                        <option value="">月</option>
                        ${getMonths().map(month => `<option value="${month}" ${selectedMonth == month ? 'selected' : ''}>${month}</option>`).join('')}
                    </select>
                </div>

                <!-- 日のドロップダウン -->
                <div class="flex-1">
                    <select
                        id="day-select"
                        class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                        ${!selectedYear || !selectedMonth ? 'disabled' : ''}
                    >
                        <option value="">日</option>
                        ${getDaysInMonth(selectedYear, selectedMonth).map(day => `<option value="${day}" ${selectedDay == day ? 'selected' : ''}>${day}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- 検索ボタン -->
            <button
                id="search-button"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out transform hover:scale-105 ${isLoading || !selectedYear || !selectedMonth || !selectedDay ? 'opacity-50 cursor-not-allowed' : ''}"
                ${isLoading || !selectedYear || !selectedMonth || !selectedDay ? 'disabled' : ''}
            >
                ${isLoading ? '検索中...' : 'なにがあった？'}
            </button>

            <!-- ローディングインジケーター -->
            ${isLoading ? `
                <div class="flex justify-center items-center mt-6">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="ml-3 text-gray-600">AIが情報を取得中です...</span>
                </div>
            ` : ''}

            <!-- エラーメッセージ -->
            ${error ? `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mt-6 relative" role="alert">
                    <strong class="font-bold">エラー！</strong>
                    <span class="block sm:inline ml-2">${error}</span>
                </div>
            ` : ''}

            <!-- 検索結果表示セクション -->
            ${dailyEvents.length > 0 ? `
                <div class="mt-8 pt-6 border-t border-gray-200">
                    <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">
                        ${parseInt(selectedYear)}年${parseInt(selectedMonth)}月${parseInt(selectedDay)}日のできごと
                    </h2>
                    <div>
                        <div class="space-y-4">
                            ${dailyEvents.map((event, index) => `
                                <div class="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 flex items-start">
                                    <!-- 絵文字表示 -->
                                    <div class="flex-shrink-0 mr-4 text-5xl">
                                        <span>${event.emoji || DEFAULT_EMOJI}</span>
                                    </div>
                                    <div class="flex-grow">
                                        <!-- タイトル -->
                                        <h3 class="text-xl font-semibold text-gray-800 mb-2">
                                            ${event.title}
                                        </h3>
                                        <!-- 概要 -->
                                        <p class="text-gray-700 text-base leading-relaxed">
                                            <span class="font-medium">概要:</span> ${event.summary}
                                        </p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <!-- 出典元情報の表示 -->
                    ${sourceInfo ? `
                        <div class="mt-8 pt-6 border-t border-gray-200 text-gray-600 text-sm text-center">
                            <p>出典元: ${sourceInfo}</p>
                            <p>（この情報は、ウェブ上の一般的な情報に基づいてAIモデルが生成したものです。）</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;

    // DOM更新後にイベントリスナーを再アタッチ
    attachEventListeners();
};

/**
 * イベントリスナーをアタッチする関数
 */
const attachEventListeners = () => {
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const daySelect = document.getElementById('day-select');
    const searchButton = document.getElementById('search-button');

    if (yearSelect) {
        yearSelect.onchange = (e) => {
            selectedYear = e.target.value;
            // 年が変更された場合、月と日が選択されていて、現在の日の値が新しい月の有効日数を超えている場合、日をリセット
            if (selectedMonth && selectedDay && e.target.value) {
                const currentDaysInMonth = getDaysInMonth(parseInt(e.target.value), parseInt(selectedMonth));
                if (parseInt(selectedDay) > currentDaysInMonth.length) {
                    selectedDay = ''; // 日をリセットして再選択を促す
                }
            }
            dailyEvents = [];
            error = '';
            sourceInfo = '';
            renderApp(); // UIを再レンダリング
        };
    }

    if (monthSelect) {
        monthSelect.onchange = (e) => {
            selectedMonth = e.target.value;
            // 月が変更された場合、年と日が選択されていて、現在の日の値が新しい月の有効日数を超えている場合、日をリセット
            if (selectedYear && selectedDay && e.target.value) {
                const currentDaysInMonth = getDaysInMonth(parseInt(selectedYear), parseInt(e.target.value));
                if (parseInt(selectedDay) > currentDaysInMonth.length) {
                    selectedDay = ''; // 日をリセットして再選択を促す
                }
            }
            dailyEvents = [];
            error = '';
            sourceInfo = '';
            renderApp(); // UIを再レンダリング
        };
    }

    if (daySelect) {
        daySelect.onchange = (e) => {
            selectedDay = e.target.value;
            dailyEvents = [];
            error = '';
            sourceInfo = '';
            renderApp(); // UIを再レンダリング
        };
    }

    if (searchButton) {
        searchButton.onclick = fetchDailyEvents; // クリックイベントハンドラ
    }
};

/**
 * その日に起きた出来事のデータをフェッチする関数
 */
const fetchDailyEvents = async () => {
    if (!selectedYear || !selectedMonth || !selectedDay) {
        error = '年、月、日をすべて選択してください。';
        renderApp();
        return;
    }

    isLoading = true;
    error = '';
    dailyEvents = [];
    sourceInfo = '';
    renderApp(); // ローディング状態をUIに反映

    try {
        const month = String(selectedMonth).padStart(2, '0');
        const day = String(selectedDay).padStart(2, '0');

        const eventsPrompt = `${parseInt(selectedYear)}年${parseInt(month)}月${parseInt(day)}日に起きた歴史的な出来事を3つ教えてください。それぞれの出来事について、タイトル、その背景や影響を簡潔に説明する具体的な概要、そしてその出来事を表す絵文字を1つ含めて、必ず以下のJSON形式で回答してください。絵文字がない場合は、'${DEFAULT_EMOJI}'を使用してください。`;
        const eventsGenerationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "title": { "type": "STRING" },
                        "summary": { "type": "STRING" },
                        "year": { "type": "STRING" },
                        "emoji": { "type": "STRING" }
                    },
                    required: ["title", "summary"]
                }
            }
        };
        const eventsPayload = {
            contents: [{ role: "user", parts: [{ text: eventsPrompt }] }],
            generationConfig: eventsGenerationConfig
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const eventsResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventsPayload)
        });

        if (!eventsResponse.ok) {
            const errorData = await eventsResponse.json();
            console.error('Events API Error:', errorData);
            throw new Error(`出来事の検索に失敗しました: ${eventsResponse.status} ${eventsResponse.statusText}`);
        }
        const eventsResult = await eventsResponse.json();
        console.log('Raw Events API Response:', eventsResult);

        if (eventsResult.candidates && eventsResult.candidates.length > 0 && eventsResult.candidates[0].content && eventsResult.candidates[0].content.parts && eventsResult.candidates[0].content.parts.length > 0) {
            const jsonText = eventsResult.candidates[0].content.parts[0].text;
            console.log('Raw JSON text from LLM (Events):', jsonText);

            if (!jsonText || jsonText.trim() === '') {
                console.warn('AIからの出来事応答が空でした。');
                error = '該当する出来事が見つかりませんでした。';
            } else {
                const parsedJson = JSON.parse(jsonText);
                const filteredEvents = parsedJson.filter(event => event.title && event.title.trim() !== '' && event.summary && event.summary.trim() !== '');
                
                if (filteredEvents.length === 0) {
                    error = '該当する出来事が見つかりませんでした。';
                } else {
                    dailyEvents = filteredEvents;
                    sourceInfo = 'AIモデルによって生成された一般的なウェブ情報に基づいています。';
                }
            }
        } else {
            error = 'AIからの応答が期待された形式ではありませんでした。';
        }

    } catch (err) {
        console.error('データの取得中にエラーが発生しました:', err);
        if (err instanceof SyntaxError) {
            error = 'AIからの応答を解析できませんでした。JSON形式が不正な可能性があります。';
        } else {
            error = `情報の検索中にエラーが発生しました: ${err.message}`;
        }
    } finally {
        isLoading = false;
        renderApp(); // 最終状態をUIに反映
    }
};

// DOMが完全に読み込まれた後に初期レンダリングとイベントリスナーのアタッチを行う
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});
