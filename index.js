const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

// 设置JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'keyboard cat'; // 请替换为您的密钥
const TOKEN_EXPIRES_IN = '1d'; // token有效期7天

// 功能配置
const FEATURE_CONFIG = {
    enableShare: false, // 是否启用分享功能
};

// 启用CORS
app.use(cors());

// 解析POST请求体
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 渲染主页
app.get('/', (req, res) => {
  res.render('index');
});

// 代理视频列表请求
app.post('/api/videos', async (req, res) => {
  try {
    const { serverUrl, token, pageNo, pageSize, searchQuery } = req.body;

    // 创建请求参数
    const formData = new URLSearchParams();
    formData.append('pageNo', String(pageNo));
    formData.append('pageSize', String(pageSize));

    if (searchQuery) {
      formData.append('videodesc', searchQuery);
      formData.append('videoname', searchQuery);
    }

    // 发起请求到实际的API服务器
    const response = await axios.post(
      `${serverUrl}/api/findVideos?token=${token}`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // 返回API响应
    res.json(response.data);
  } catch (error) {
    console.error('API请求失败:', error);
    res.status(500).json({
      error: '请求失败',
      message: error.message
    });
  }
});

// 提交视频接口
app.post('/api/submit', async (req, res) => {
    try {
        const { serverUrl, token, videoUrl } = req.body;
        
        // 创建请求参数
        const formData = new URLSearchParams();
        formData.append('token', token);
        formData.append('video', videoUrl);

        const response = await axios.post(
            `${serverUrl}/api/processingVideos`,
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('提交视频失败:', error);
        res.status(500).json({
            resCode: '999999',
            message: error.response?.data?.message || '提交视频失败'
        });
    }
});

// 渲染播放页
app.get('/play', (req, res) => {
    console.log('Rendering play page with config:', FEATURE_CONFIG);
    res.render('play', { 
        config: FEATURE_CONFIG
    });
});

// 统一响应格式
const createResponse = (resCode, data, message = '') => ({
    resCode,
    data,
    message
});

// 统一错误处理
const handleError = (res, error, defaultMessage = '操作失败') => {
    console.error(error);
    const message = error.response?.data?.message || error.message || defaultMessage;
    res.status(500).json(createResponse('999999', null, message));
};

// 加密视频数据
app.post('/api/encrypt', (req, res) => {
    try {
        if (!FEATURE_CONFIG.enableShare) {
            return res.status(403).json(createResponse('999999', null, '分享功能未启用'));
        }

        const { videoData } = req.body;
        if (!videoData) {
            return res.status(400).json(createResponse('999999', null, '视频数据不能为空'));
        }

        const token = jwt.sign({ videoData }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
        res.json(createResponse('000001', { token }));
    } catch (error) {
        handleError(res, error, '加密失败');
    }
});

// 解密视频数据
app.post('/api/decrypt', (req, res) => {
    try {
        if (!FEATURE_CONFIG.enableShare) {
            return res.status(403).json(createResponse('999999', null, '分享功能未启用'));
        }

        const { token } = req.body;
        if (!token) {
            return res.status(400).json(createResponse('999999', null, 'token不能为空'));
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        res.json(createResponse('000001', { videoData: decoded.videoData }));
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(createResponse('999999', null, '分享链接已过期'));
        }
        handleError(res, error, '解密失败');
    }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 