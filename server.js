import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// DeepSeek R1 API配置
const API_KEY = 'a7882634-638d-4c89-8b7e-2ea64557316e';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 系统提示词
const SYSTEM_PROMPT = `你是一位专业的生活教练，拥有丰富的心理学和个人成长指导经验。你的目标是：
1. 通过倾听和提问深入理解用户的困扰和需求
2. 提供具体、可行的建议和解决方案
3. 鼓励用户积极面对挑战，培养良好的生活习惯
4. 帮助用户制定合理的目标并持续跟进
5. 用温暖、专业的语气与用户交流

请记住：你的建议应该是实用的、循序渐进的，并且要考虑到用户的具体情况。`;

// 处理聊天请求
app.post('/chat', async (req, res) => {
    console.log('收到新的聊天请求:', req.body);
    try {
        const userMessage = req.body.message;

        // 准备请求数据
        const requestData = {
            model: 'deepseek-r1-250120',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            stream: true,
            temperature: 0.6
        };

        // 设置响应头，支持流式输出
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        console.log('发送请求到API，请求数据:', JSON.stringify(requestData));
        
        // 发送请求到DeepSeek R1 API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData),
            timeout: 60000 // 添加60秒超时设置
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('API响应错误:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: errorBody
            });
            throw new Error(`API请求失败: ${response.status} - ${response.statusText}`);
        }

        // 处理流式响应
        const stream = response.body;
        const decoder = new TextDecoder();

        for await (const chunk of stream) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    if (line.startsWith('data: ')) {
                        const jsonData = JSON.parse(line.slice(6));
                        if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                            console.log('收到API响应数据:', jsonData.choices[0].delta.content);
                            res.write(jsonData.choices[0].delta.content);
                        }
                    }
                } catch (e) {
                    console.error('解析流式数据时出错:', e, '\n原始数据:', line);
                }
            }
        }

        res.end();
    } catch (error) {
        console.error('处理聊天请求时出错:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        let errorMessage = '抱歉，我现在有点累了，请稍后再和我聊天吧~';
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage = '抱歉，我思考得有点久，请稍后再试~';
        } else if (error.message.includes('API请求失败')) {
            errorMessage = '抱歉，我现在有点不在状态，请稍后再找我聊天~';
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            errorMessage = '抱歉，我们之间的连接似乎出了点问题，请稍后再试~';
        }
        
        console.log('发送错误响应:', errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});