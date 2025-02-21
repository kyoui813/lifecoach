// 获取DOM元素
const messageList = document.getElementById('messageList');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// 添加消息到聊天界面
function addMessage(content, isAI = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAI ? 'ai' : 'user'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    messageList.appendChild(messageDiv);
    
    // 滚动到最新消息
    messageList.scrollTop = messageList.scrollHeight;
}

// 发送消息到服务器
async function sendMessage(message) {
    try {
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('网络请求失败');
        }

        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            aiResponse += chunk;
            
            // 更新AI回复内容
            const lastMessage = messageList.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('ai')) {
                lastMessage.querySelector('.message-content').textContent = aiResponse;
            } else {
                addMessage(aiResponse, true);
            }
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessage('抱歉，发生了一些错误，请稍后重试。', true);
    }
}

// 处理发送按钮点击事件
sendButton.addEventListener('click', async () => {
    const message = userInput.value.trim();
    if (!message) return;
    
    // 添加用户消息到界面
    addMessage(message);
    
    // 清空输入框
    userInput.value = '';
    
    // 发送消息到服务器
    await sendMessage(message);
});

// 处理回车键发送消息
userInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});