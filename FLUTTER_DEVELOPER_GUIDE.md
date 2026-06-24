# 📱 Flutter Integration Guide: Sign Language AI Platform

This document describes how the Flutter application connects to the Node.js Express backend and uses the AI models.

---

## 🔗 1. Base URL & Environments

- **Production API base URL**: `https://sign-language-platform.vercel.app`
- **Development API base URL**: `http://localhost:5000` (or your machine's local IP address when debugging on physical mobile devices, e.g., `http://192.168.1.X:5000`)

All API routes start with `/api`.

---

## 🔑 2. Authentication Flow (JWT)

We use short-lived JSON Web Tokens (JWT) for authentication and a long-lived refresh token stored on the client side to obtain new access tokens.

### A. SignUp & Login
- **SignUp Endpoint**: `POST /api/auth/register`
- **Login Endpoint**: `POST /api/auth/login`

**Login Request Body:**
```json
{
  "email": "test@gmail.com",
  "password": "123456"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOi...",       // Access Token (expires in 15m)
  "refreshToken": "eyJhbGciOi...",// Refresh Token (expires in 7d)
  "user": {
    "id": "603d2b...",
    "name": "Abdallah",
    "email": "test@gmail.com",
    "role": "user"
  }
}
```

### B. Authenticated Requests
For all routes under `/api/user` and `/api/admin`, you **must** include the access token in the `Authorization` header:

```http
Authorization: Bearer <your_access_token>
```

### C. Refreshing Expired Tokens
When the access token expires, the backend will return a `401 Unauthorized` status. You should intercept this error, call the refresh endpoint to get a new access token, and retry the original request.

- **Refresh Endpoint**: `POST /api/auth/refresh`
- **Request Body**: `{"refreshToken": "<your_refresh_token>"}`
- **Response**: `{"accessToken": "<new_access_token>"}`

#### 💡 Recommended Flutter Implementation (using `dio`):
```dart
import 'package:dio/dio.dart';

class AuthInterceptor extends Interceptor {
  final Dio dio;
  AuthInterceptor(this.dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Retrieve token from your secure storage (e.g. flutter_secure_storage)
    String? token = SecureStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  }

  @override
  void onError(DioError err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // 1. Get refresh token
      String? refreshToken = SecureStorage.getRefreshToken();
      if (refreshToken != null) {
        try {
          // 2. Call refresh endpoint using a fresh Dio instance to avoid infinite loop
          final refreshDio = Dio(BaseOptions(baseUrl: 'https://sign-language-platform.vercel.app'));
          final response = await refreshDio.post('/api/auth/refresh', data: {
            'refreshToken': refreshToken,
          });
          
          final newAccessToken = response.data['accessToken'];
          // 3. Save new access token
          await SecureStorage.saveAccessToken(newAccessToken);
          
          // 4. Retry the failed request with the new token
          err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
          final cloneReq = await dio.fetch(err.requestOptions);
          return handler.resolve(cloneReq);
        } catch (e) {
          // Refresh token also expired or invalid -> log user out
          SecureStorage.clearTokens();
          // Navigate to Login screen
        }
      }
    }
    return handler.next(err);
  }
}
```

---

## 🤖 3. AI Endpoints & Data Formats

The AI endpoints are grouped under `/api/ai/*`. They are proxied by our backend to the high-performance Python FastAPI service.

### 🎥 A. Video Sign Model (Real-time Hand/Gesture recognition)
Recognizes dynamic sign words from a sequence of camera frames.
- **Endpoint**: `POST /api/ai/predict`
- **Payload Format**: JSON containing a `frames` array.
- **Format Requirements**:
  - The model expects **exactly 30 frames**.
  - Each frame contains **exactly 126 coordinate values** representing the coordinates of the landmarks.
  - The final array shape must be `30 × 126`.
  
#### How to extract the 126 values:
1. In Flutter, use the **`google_mlkit_hand_landmarker`** (or a TensorFlow Lite MediaPipe custom binding) to track hands.
2. MediaPipe detects 21 hand landmarks per hand. Each landmark has `(x, y, z)` coordinates.
3. **Left Hand**: 21 landmarks × 3 coordinates = 63 values.
4. **Right Hand**: 21 landmarks × 3 coordinates = 63 values.
5. Total coordinates = `63 + 63 = 126` values per frame.
6. If a hand is not visible in a frame, populate its corresponding 63 positions with `0.0`.
7. Accumulate 30 consecutive frames in a list and send them to the backend.

**Request Payload Example:**
```json
{
  "frames": [
    [0.12, 0.45, -0.01, ..., 0.0], // Frame 1 (126 values)
    [0.13, 0.46, -0.01, ..., 0.0]  // Frame 2 (126 values)
    // ... total 30 frames
  ]
}
```

**Response Example:**
```json
{
  "label": "شكرا",
  "confidence": 0.94
}
```

---

### 📸 B. Image Sign Model (Static gesture / Alphabet recognition)
Predicts a static sign (like alphabets) from an image.
- **Endpoint**: `POST /api/ai/predict-image`
- **Content-Type**: `multipart/form-data`
- **Request Form Field**: `file` (Binary Image File)

**Flutter Upload Example (using `dio`):**
```dart
Future<String?> uploadSignImage(String filePath) async {
  var formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(filePath, filename: 'sign.jpg'),
  });

  var response = await dio.post('/api/ai/predict-image', data: formData);
  return response.data['label']; // Returns e.g. "ممكن"
}
```

---

### 🎤 C. Voice Translation Model (Speech-to-Text)
Transcribes spoken Arabic from an audio file into Arabic text.
- **Endpoint**: `POST /api/ai/predict-voice`
- **Content-Type**: `multipart/form-data`
- **Request Form Field**: `file` (Binary Audio File: wav, mp3, m4a, etc.)

**Flutter Upload Example (using `dio`):**
```dart
Future<String?> uploadVoiceAudio(String filePath) async {
  var formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(filePath, filename: 'voice.wav'),
  });

  var response = await dio.post('/api/ai/predict-voice', data: formData);
  return response.data['text']; // Returns e.g. "مرحبا بكم في تطبيق عبر"
}
```

---

### 💬 D. Arabic AI Chatbot
Answering questions about the application and sign language learning in Arabic.
- **Endpoint**: `POST /api/ai/chat`
- **Request Body**:
```json
{
  "message": "ما هو الهدف من تطبيق عبر؟"
}
```
- **Response**:
```json
{
  "response": "تطبيق عَبّر هو رفيقك لكسر حاجز التواصل...",
  "intent": "about_app",
  "confidence": 0.98
}
```

---

### 🎯 E. Sign Verification Model (Quizzes/Placement Tests)
Checks if the user's sign coordinates match a target word they are asked to perform.
- **Endpoint**: `POST /api/ai/verify-sign`
- **Request Body**:
```json
{
  "expected_word": "شكرا",
  "frames": [
    [0.1, 0.2, -0.05, ..., 0.0] // 30 frames × 126 coordinates
  ]
}
```
- **Response**:
```json
{
  "correct": true,
  "expected": "شكرا",
  "got": "شكرا",
  "confidence": 94.5
}
```

---

## 📊 4. Course Progress Integration

Once users complete a lesson or take a quiz, you should save their progress to the database.

- **Endpoint**: `PUT /api/user/progress`
- **Authorization**: Bearer token required.
- **Request Body**:
```json
{
  "progress": {
    "currentLesson": 3,
    "completedLessons": [1, 2],
    "score": 85
  }
}
```

---

## 📦 What to provide to the Flutter Developer

When handing this project over to the Flutter developer, send them:
1. **The Base URL** of the API: `https://sign-language-platform.vercel.app`.
2. **This Guide (`FLUTTER_DEVELOPER_GUIDE.md`)** for quick integration and implementation references.
3. **The Postman Collection (`sign_language_postman_collection.json`)**, which they can import directly into Postman to instantly test all requests.
4. **The Swagger Docs link**: `https://sign-language-platform.vercel.app/docs` so they have an interactive playground to test requests directly in their browser.
