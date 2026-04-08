# Tạo hình ảnh bằng Nano Banana

> Nguồn: [Google AI for Developers - Gemini API](https://ai.google.dev/gemini-api/docs/image-generation?hl=vi)

---

## Giới thiệu

**Nano Banana** là tên gọi của các tính năng tạo hình ảnh gốc của Gemini. Gemini có thể tạo và xử lý hình ảnh theo cách đàm thoại bằng văn bản, hình ảnh hoặc kết hợp cả hai — cho phép bạn tạo, chỉnh sửa và lặp lại hình ảnh một cách linh hoạt chưa từng có.

Tất cả hình ảnh được tạo đều có [hình mờ SynthID](https://ai.google.dev/responsible/docs/safeguards/synthid).

---

## Các mô hình Nano Banana

Nano Banana bao gồm 3 mô hình riêng biệt trong Gemini API:

| Mô hình | Model ID | Đặc điểm |
|---------|----------|-----------|
| **Nano Banana 2** | `gemini-3.1-flash-image-preview` | Phiên bản hiệu suất cao, tối ưu hoá về tốc độ và trường hợp sử dụng khối lượng lớn |
| **Nano Banana Pro** | `gemini-3-pro-image-preview` | Sản xuất tài sản chuyên nghiệp, suy luận nâng cao ("Tư duy"), văn bản độ trung thực cao |
| **Nano Banana** | `gemini-2.5-flash-image` | Tốc độ và hiệu suất cao, tối ưu cho tác vụ khối lượng lớn và độ trễ thấp |

---

## Tính năng mới của Gemini 3 Image

- **Đầu ra độ phân giải cao**: Hỗ trợ 512 (0.5K), 1K, 2K và 4K
- **Kết xuất văn bản nâng cao**: Tạo văn bản dễ đọc, cách điệu cho infographic, menu, sơ đồ, marketing
- **Liên kết thực tế với Google Tìm kiếm**: Tạo hình ảnh dựa trên dữ liệu thời gian thực (thời tiết, cổ phiếu, sự kiện)
- **Chế độ Tư duy (Thinking)**: Suy luận qua các câu lệnh phức tạp, tạo "hình ảnh ý tưởng" tạm thời
- **Tối đa 14 hình ảnh tham khảo**
- **Tỷ lệ khung hình mới**: 1:4, 4:1, 1:8 và 8:1 (Gemini 3.1 Flash Image)

### Giới hạn hình ảnh tham khảo

| | Gemini 3.1 Flash Image | Gemini 3 Pro Image |
|---|---|---|
| Đối tượng độ trung thực cao | Tối đa 10 | Tối đa 6 |
| Nhân vật (tính nhất quán) | Tối đa 4 | Tối đa 5 |

---

## 1. Tạo hình ảnh từ văn bản (Text → Image)

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"
response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[prompt],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

### JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {
  const ai = new GoogleGenAI({});

  const prompt = "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: prompt,
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
      console.log("Image saved as gemini-native-image.png");
    }
  }
}

main();
```

### REST (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
      ]
    }]
  }'
```

---

## 2. Chỉnh sửa hình ảnh (Text + Image → Image)

> **Lưu ý**: Đảm bảo bạn có quyền cần thiết đối với mọi hình ảnh tải lên. Tuân theo [Chính sách sử dụng](https://policies.google.com/terms/generative-ai/use-policy).

Cung cấp hình ảnh + câu lệnh văn bản để thêm, xoá, sửa đổi phần tử, thay đổi kiểu hoặc điều chỉnh màu sắc.

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation"
image = Image.open("/path/to/cat_image.png")

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[prompt, image],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```

### JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

async function main() {
  const ai = new GoogleGenAI({});

  const imagePath = "path/to/cat_image.png";
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");

  const prompt = [
    { text: "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation" },
    {
      inlineData: {
        mimeType: "image/png",
        data: base64Image,
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: prompt,
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
    }
  }
}

main();
```

### REST (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{
    \"contents\": [{
      \"parts\":[
        {\"text\": \"Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation\"},
        {
          \"inline_data\": {
            \"mime_type\":\"image/jpeg\",
            \"data\": \"<BASE64_IMAGE_DATA>\"
          }
        }
      ]
    }]
  }"
```

---

## 3. Chỉnh sửa nhiều lượt (Multi-turn Editing)

Sử dụng tính năng trò chuyện (chat) để lặp lại và tinh chỉnh hình ảnh qua nhiều lượt.

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

chat = client.chats.create(
    model="gemini-3.1-flash-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)

# Lượt 1: Tạo infographic
message = 'Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant\'s favorite food.'
response = chat.send_message(message)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("photosynthesis.png")

# Lượt 2: Chỉnh sửa - đổi ngôn ngữ
message = "Update this infographic to be in Spanish. Do not change any other elements."
response = chat.send_message(message,
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="2K"
        ),
    ))

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("photosynthesis_spanish.png")
```

### JavaScript

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({});

async function main() {
  const chat = ai.chats.create({
    model: "gemini-3.1-flash-image-preview",
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      tools: [{ googleSearch: {} }],
    },
  });

  // Lượt 1
  let response = await chat.sendMessage({
    message: 'Create a vibrant infographic about photosynthesis.'
  });

  // Lượt 2
  response = await chat.sendMessage({
    message: 'Update this infographic to be in Spanish.',
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
      tools: [{ googleSearch: {} }],
    },
  });
}

main();
```

---

## 4. Sử dụng nhiều hình ảnh tham khảo

Kết hợp tối đa 14 hình ảnh tham khảo để tạo hình ảnh cuối cùng.

### Python

```python
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=[
        "An office group photo of these people, they are making funny faces.",
        Image.open('person1.png'),
        Image.open('person2.png'),
        Image.open('person3.png'),
        Image.open('person4.png'),
        Image.open('person5.png'),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="5:4",
            image_size="2K"
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("office.png")
```

---

## 5. Liên kết thực tế với Google Tìm kiếm (Search Grounding)

Tạo hình ảnh dựa trên thông tin thời gian thực: dự báo thời tiết, biểu đồ cổ phiếu, sự kiện gần đây...

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

prompt = "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart."

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
        tools=[{"google_search": {}}]
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image := part.as_image():
        image.save("weather.png")
```

### REST (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Visualize the current weather forecast for the next 5 days in San Francisco"}]}],
    "tools": [{"google_search": {}}],
    "generationConfig": {
      "responseModalities": ["TEXT", "IMAGE"],
      "imageConfig": {"aspectRatio": "16:9"}
    }
  }'
```

Phản hồi bao gồm `groundingMetadata` chứa:

- **`searchEntryPoint`**: HTML/CSS để hiển thị đề xuất tìm kiếm
- **`groundingChunks`**: 3 nguồn web hàng đầu được dùng làm cơ sở cho hình ảnh

---

## 6. Tìm kiếm hình ảnh (Image Search) — Chỉ Gemini 3.1 Flash Image

Cho phép mô hình sử dụng hình ảnh trên web qua Google Tìm kiếm làm bối cảnh trực quan để tạo ảnh.

> **Lưu ý**: Không thể dùng tính năng này để tìm kiếm người.

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A detailed painting of a Timareta butterfly resting on a flower",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        tools=[
            types.Tool(google_search=types.GoogleSearch(
                search_types=types.SearchTypes(
                    web_search=types.WebSearch(),
                    image_search=types.ImageSearch()
                )
            ))
        ]
    )
)
```

### REST (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "A detailed painting of a Timareta butterfly resting on a flower"}]}],
    "tools": [{"google_search": {"searchTypes": {"webSearch": {}, "imageSearch": {}}}}],
    "generationConfig": {
      "responseModalities": ["IMAGE"]
    }
  }'
```

### Yêu cầu hiển thị khi dùng Image Search

- **Ghi nhận nguồn**: Cung cấp đường link đến trang web chứa hình ảnh nguồn
- **Điều hướng trực tiếp**: Đường dẫn 1 click từ ảnh nguồn đến trang web nguồn

### Metadata phản hồi

- **`imageSearchQueries`**: Cụm từ tìm kiếm mô hình sử dụng
- **`groundingChunks`**: Thông tin nguồn (bao gồm `uri` trang đích và `image_uri` URL ảnh trực tiếp)
- **`groundingSupports`**: Liên kết nội dung tạo với nguồn trích dẫn
- **`searchEntryPoint`**: Chip "Google Tìm kiếm" với HTML/CSS

---

## 7. Độ phân giải hình ảnh

Mặc định tạo ảnh 1K. Có thể chỉ định `image_size` trong config:

| Giá trị | Ghi chú |
|---------|---------|
| `"512"` | 0.5K — chỉ Gemini 3.1 Flash Image |
| `"1K"` | Mặc định |
| `"2K"` | |
| `"4K"` | Độ phân giải cao nhất |

> **Quan trọng**: Phải dùng chữ "K" viết hoa (1K, 2K, 4K). Viết thường (1k) sẽ bị từ chối.

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="Da Vinci style anatomical sketch of a Monarch butterfly.",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio="1:1",
            image_size="4K"
        ),
    )
)
```

---

## 8. Tỷ lệ khung hình (Aspect Ratios)

Các tỷ lệ khung hình được hỗ trợ:

```
"1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"
```

> Tỷ lệ `1:4`, `4:1`, `1:8`, `8:1` chỉ có ở Gemini 3.1 Flash Image Preview.

---

## 9. Chế độ Tư duy (Thinking)

Mô hình hình ảnh Gemini 3 sử dụng quy trình suy luận ("Tư duy") cho câu lệnh phức tạp. Tính năng này bật mặc định và không thể tắt.

- Tạo tối đa 2 hình ảnh tạm thời để kiểm thử bố cục
- Hình ảnh cuối cùng trong phần Tư duy cũng là hình ảnh cuối cùng

### Cấp độ Tư duy (chỉ Gemini 3.1 Flash Image)

| Cấp độ | Mô tả |
|--------|-------|
| `"minimal"` | Mặc định. Độ trễ thấp nhất. Vẫn có tư duy. |
| `"high"` | Chất lượng cao hơn, độ trễ cao hơn |

### Python

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3.1-flash-image-preview",
    contents="A futuristic city built inside a giant glass bottle floating in space",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        thinking_config=types.ThinkingConfig(
            thinking_level="High",
            include_thoughts=True
        ),
    )
)

for part in response.parts:
    if part.thought:  # Bỏ qua phần suy nghĩ
        continue
    if part.text:
        print(part.text)
    elif image := part.as_image():
        image.show()
```

### REST (cURL)

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "A futuristic city built inside a giant glass bottle floating in space"}]}],
    "generationConfig": {
      "responseModalities": ["IMAGE"],
      "thinkingConfig": {
        "thinkingLevel": "High",
        "includeThoughts": true
      }
    }
  }'
```

> **Lưu ý**: Token tư duy sẽ được tính phí bất kể `includeThoughts` là `true` hay `false`.

### Chữ ký suy nghĩ (Thought Signatures)

- Dùng để duy trì bối cảnh suy luận trong tương tác nhiều lượt
- Nếu dùng Google Gen AI SDK chính thức + tính năng chat → **chữ ký được xử lý tự động**
- Quy tắc: Tất cả `inline_data` hình ảnh (không phải thought) đều có `thought_signature`. Phần thought thì không có.

---

## 10. Các chế độ tạo hình ảnh khác

| Chế độ | Mô tả | Ví dụ |
|--------|-------|-------|
| Text → Image + Text (xen kẽ) | Tạo hình ảnh kèm văn bản | "Tạo công thức minh hoạ cho món paella" |
| Image + Text → Image + Text | Dùng ảnh + text đầu vào tạo ảnh + text mới | "Những màu ghế sofa nào phù hợp không gian này?" |

---

## 11. Tạo hàng loạt hình ảnh theo lô (Batch API)

> Nguồn: [Batch API - Image Generation](https://ai.google.dev/gemini-api/docs/batch-api?hl=vi#image-generation)

Gemini Batch API xử lý số lượng lớn yêu cầu một cách **không đồng bộ** với mức phí bằng **50% mức phí tiêu chuẩn**. Thời gian xử lý mục tiêu là 24 giờ, nhưng phần lớn trường hợp sẽ nhanh hơn nhiều. Phù hợp cho các tác vụ quy mô lớn, không khẩn cấp.

### 2 cách gửi yêu cầu Batch

| Phương thức | Mô tả | Phù hợp với |
|------------|-------|-------------|
| **Yêu cầu cùng dòng (Inline)** | Danh sách `GenerateContentRequest` trực tiếp trong request | Lô nhỏ (tổng < 20 MB) |
| **Tệp đầu vào (JSONL)** | File JSON Lines, mỗi dòng = 1 `GenerateContentRequest` | Lô lớn (tối đa 2 GB/file) |

### Quy trình tạo ảnh hàng loạt

Quy trình gồm 4 bước: (1) Tạo & upload file JSONL → (2) Tạo batch job → (3) Theo dõi trạng thái → (4) Lấy kết quả.

### Cấu trúc file JSONL cho tạo ảnh

Mỗi dòng trong file JSONL chứa một đối tượng JSON với `key` (ID do bạn đặt) và `request` (chứa prompt + config). **Quan trọng**: Phải có `"responseModalities": ["TEXT", "IMAGE"]` trong `generation_config`.

```jsonl
{"key": "request-1", "request": {"contents": [{"parts": [{"text": "A big letter A surrounded by animals starting with the A letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}
{"key": "request-2", "request": {"contents": [{"parts": [{"text": "A big letter B surrounded by animals starting with the B letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}
```

### Python — Tạo ảnh hàng loạt bằng tệp đầu vào (đầy đủ 4 bước)

```python
import json
import time
import base64
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

# ===== Bước 1: Tạo và upload file JSONL =====
file_name = "my-batch-image-requests.jsonl"
with open(file_name, "w") as f:
    requests = [
        {
            "key": "request-1",
            "request": {
                "contents": [{"parts": [{"text": "A big letter A surrounded by animals starting with the A letter"}]}],
                "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}
            }
        },
        {
            "key": "request-2",
            "request": {
                "contents": [{"parts": [{"text": "A big letter B surrounded by animals starting with the B letter"}]}],
                "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}
            }
        }
    ]
    for req in requests:
        f.write(json.dumps(req) + "\n")

uploaded_file = client.files.upload(
    file=file_name,
    config=types.UploadFileConfig(display_name='my-batch-image-requests', mime_type='jsonl')
)
print(f"Uploaded file: {uploaded_file.name}")

# ===== Bước 2: Tạo batch job =====
file_batch_job = client.batches.create(
    model="gemini-3-pro-image-preview",
    src=uploaded_file.name,
    config={
        'display_name': "file-image-upload-job-1",
    },
)
print(f"Created batch job: {file_batch_job.name}")

# ===== Bước 3: Theo dõi trạng thái =====
job_name = file_batch_job.name
print(f"Polling status for job: {job_name}")

completed_states = set([
    'JOB_STATE_SUCCEEDED',
    'JOB_STATE_FAILED',
    'JOB_STATE_CANCELLED',
    'JOB_STATE_EXPIRED',
])

batch_job = client.batches.get(name=job_name)
while batch_job.state.name not in completed_states:
    print(f"Current state: {batch_job.state.name}")
    time.sleep(10)
    batch_job = client.batches.get(name=job_name)

print(f"Job finished with state: {batch_job.state.name}")

# ===== Bước 4: Lấy kết quả =====
if batch_job.state.name == 'JOB_STATE_SUCCEEDED':
    result_file_name = batch_job.dest.file_name
    print(f"Results are in file: {result_file_name}")
    print("Downloading result file content...")
    file_content_bytes = client.files.download(file=result_file_name)
    file_content = file_content_bytes.decode('utf-8')

    for line in file_content.splitlines():
        if line:
            parsed_response = json.loads(line)
            if 'response' in parsed_response and parsed_response['response']:
                for part in parsed_response['response']['candidates'][0]['content']['parts']:
                    if part.get('text'):
                        print(part['text'])
                    elif part.get('inlineData'):
                        print(f"Image mime type: {part['inlineData']['mimeType']}")
                        data = base64.b64decode(part['inlineData']['data'])
                        # Lưu ảnh: open("output.png", "wb").write(data)
            elif 'error' in parsed_response:
                print(f"Error: {parsed_response['error']}")
elif batch_job.state.name == 'JOB_STATE_FAILED':
    print(f"Error: {batch_job.error}")
```

### JavaScript — Tạo ảnh hàng loạt bằng tệp đầu vào (đầy đủ 4 bước)

```javascript
import { GoogleGenAI } from '@google/genai';
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const ai = new GoogleGenAI({});

async function run() {
    // ===== Bước 1: Tạo và upload file JSONL =====
    const fileName = "my-batch-image-requests.jsonl";
    const requests = [
        { "key": "request-1", "request": { "contents": [{ "parts": [{ "text": "A big letter A surrounded by animals starting with the A letter" }] }], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]} } },
        { "key": "request-2", "request": { "contents": [{ "parts": [{ "text": "A big letter B surrounded by animals starting with the B letter" }] }], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]} } }
    ];

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, fileName);

    const writeStream = fs.createWriteStream(filePath, { flags: 'w' });
    for (const req of requests) {
        writeStream.write(JSON.stringify(req) + '\n');
    }
    writeStream.end();

    const uploadedFile = await ai.files.upload({
        file: fileName,
        config: { mimeType: 'jsonl' }
    });
    console.log(`Uploaded file: ${uploadedFile.name}`);

    // ===== Bước 2: Tạo batch job =====
    const fileBatchJob = await ai.batches.create({
        model: 'gemini-3-pro-image-preview',
        src: uploadedFile.name,
        config: { displayName: 'file-image-upload-job-1' }
    });
    console.log(`Created batch job: ${fileBatchJob.name}`);

    // ===== Bước 3: Theo dõi trạng thái =====
    let batchJob;
    const completedStates = new Set([
        'JOB_STATE_SUCCEEDED', 'JOB_STATE_FAILED',
        'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED',
    ]);

    batchJob = await ai.batches.get({ name: fileBatchJob.name });
    while (!completedStates.has(batchJob.state)) {
        console.log(`Current state: ${batchJob.state}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        batchJob = await ai.batches.get({ name: batchJob.name });
    }
    console.log(`Job finished with state: ${batchJob.state}`);

    // ===== Bước 4: Lấy kết quả =====
    if (batchJob.state === 'JOB_STATE_SUCCEEDED') {
        if (batchJob.dest?.fileName) {
            const resultFileName = batchJob.dest.fileName;
            console.log(`Results are in file: ${resultFileName}`);
            const fileContentBuffer = await ai.files.download({ file: resultFileName });
            const fileContent = fileContentBuffer.toString('utf-8');

            for (const line of fileContent.split('\n')) {
                if (line) {
                    const parsedResponse = JSON.parse(line);
                    if (parsedResponse.response) {
                        for (const part of parsedResponse.response.candidates[0].content.parts) {
                            if (part.text) {
                                console.log(part.text);
                            } else if (part.inlineData) {
                                console.log(`Image mime type: ${part.inlineData.mimeType}`);
                            }
                        }
                    } else if (parsedResponse.error) {
                        console.error(`Error: ${parsedResponse.error}`);
                    }
                }
            }
        }
    } else if (batchJob.state === 'JOB_STATE_FAILED') {
        console.error(`Error: ${JSON.stringify(batchJob.error)}`);
    }
}
run();
```

### REST (cURL) — Tạo ảnh hàng loạt bằng tệp đầu vào

```bash
# ===== Bước 1: Tạo file JSONL =====
echo '{"key": "request-1", "request": {"contents": [{"parts": [{"text": "A big letter A surrounded by animals starting with the A letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}' > my-batch-image-requests.jsonl
echo '{"key": "request-2", "request": {"contents": [{"parts": [{"text": "A big letter B surrounded by animals starting with the B letter"}]}], "generation_config": {"responseModalities": ["TEXT", "IMAGE"]}}}' >> my-batch-image-requests.jsonl

# Upload file bằng File API (xem: https://ai.google.dev/gemini-api/docs/files#upload_a_file)
# Sau khi upload, set biến BATCH_INPUT_FILE = tên file (vd: files/abcdef123)
BATCH_INPUT_FILE="files/your-uploaded-file-name"

# ===== Bước 2: Tạo batch job =====
printf -v request_data '{
    "batch": {
        "display_name": "my-batch-file-image-requests",
        "input_config": { "file_name": "%s" }
    }
}' "$BATCH_INPUT_FILE"

curl https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:batchGenerateContent \
  -X POST \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type:application/json" \
  -d "$request_data" > created_batch.json

BATCH_NAME=$(jq -r '.name' created_batch.json)
echo "Created batch job: $BATCH_NAME"

# ===== Bước 3: Theo dõi trạng thái =====
curl https://generativelanguage.googleapis.com/v1beta/$BATCH_NAME \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type:application/json" > batch_status.json

echo "Current status:"
jq '.' batch_status.json

# ===== Bước 4: Lấy kết quả (khi state = JOB_STATE_SUCCEEDED) =====
batch_state=$(jq -r '.state' batch_status.json)
if [[ $batch_state = "JOB_STATE_SUCCEEDED" ]]; then
    responses_file_name=$(jq -r '.dest.fileName' batch_status.json)
    echo "Job succeeded. Downloading results from $responses_file_name..."
    curl https://generativelanguage.googleapis.com/download/v1beta/$responses_file_name:download?alt=media \
      -H "x-goog-api-key: $GEMINI_API_KEY" > batch_results.jsonl
    echo "Results saved to batch_results.jsonl"
fi
```

### Python — Tạo ảnh hàng loạt bằng yêu cầu cùng dòng (Inline)

```python
from google import genai
from google.genai import types

client = genai.Client()

inline_requests = [
    {
        'contents': [{'parts': [{'text': 'A big letter A surrounded by animals starting with the A letter'}], 'role': 'user'}],
        'config': {'response_modalities': ['TEXT', 'IMAGE']}
    },
    {
        'contents': [{'parts': [{'text': 'A big letter B surrounded by animals starting with the B letter'}], 'role': 'user'}],
        'config': {'response_modalities': ['TEXT', 'IMAGE']}
    }
]

inline_batch_job = client.batches.create(
    model="gemini-3-pro-image-preview",
    src=inline_requests,
    config={
        'display_name': "inline-image-job-1",
    },
)

print(f"Created batch job: {inline_batch_job.name}")
# Sau đó theo dõi trạng thái và lấy kết quả tương tự như trên
```

### Các trạng thái công việc theo lô

| Trạng thái | Mô tả |
|-----------|-------|
| `JOB_STATE_PENDING` | Đã tạo, đang chờ xử lý |
| `JOB_STATE_RUNNING` | Đang xử lý |
| `JOB_STATE_SUCCEEDED` | Hoàn tất thành công — có thể lấy kết quả |
| `JOB_STATE_FAILED` | Thất bại — kiểm tra thông tin lỗi |
| `JOB_STATE_CANCELLED` | Đã bị huỷ bởi người dùng |
| `JOB_STATE_EXPIRED` | Hết hạn (chạy/chờ > 48 giờ) — thử gửi lại hoặc chia nhỏ |

### Quản lý công việc theo lô

```python
# Liệt kê các công việc
batch_jobs = client.batches.list()
for job in batch_jobs:
    print(job)

# Huỷ công việc
client.batches.cancel(name=batch_job.name)

# Xoá công việc
client.batches.delete(name=batch_job.name)
```

### Các phương pháp hay nhất

- **Dùng tệp JSONL cho lô lớn**: Dễ quản lý hơn, tránh giới hạn kích thước request. Giới hạn 2 GB/file.
- **Kiểm tra lỗi**: Sau khi job hoàn tất, kiểm tra `batchStats` để biết `failedRequestCount`. Phân tích từng dòng trong file kết quả.
- **Gửi 1 lần duy nhất**: Gửi cùng request 2 lần = 2 job riêng biệt.
- **Chia nhỏ lô quá lớn**: Nếu cần kết quả trung gian sớm hơn, chia thành nhiều lô nhỏ.

### Chi tiết kỹ thuật

- **Giá**: 50% mức phí API tương tác tiêu chuẩn
- **SLO**: Mục tiêu hoàn tất trong 24 giờ (thường nhanh hơn)
- **Bộ nhớ đệm**: Context caching được hỗ trợ cho batch requests
- **Mô hình hỗ trợ**: Xem [trang Mô hình](https://ai.google.dev/gemini-api/docs/models) để biết chi tiết

---

## 12. Hướng dẫn đặt câu lệnh (Prompting)

### Nguyên tắc cốt lõi

> **Mô tả cảnh, đừng chỉ liệt kê từ khoá.**
> Một đoạn văn mô tả, tường thuật sẽ luôn tạo ra hình ảnh tốt hơn so với danh sách từ rời rạc.

### Chiến lược 1: Cảnh chân thực (Photorealistic)

Sử dụng thuật ngữ nhiếp ảnh: góc camera, ống kính, ánh sáng, chi tiết nhỏ.

**Mẫu câu lệnh:**

```
A photorealistic [shot type] of [subject], [action or expression], set in
[environment]. The scene is illuminated by [lighting description], creating
a [mood] atmosphere. Captured with a [camera/lens details], emphasizing
[key textures and details]. The image should be in a [aspect ratio] format.
```

**Ví dụ:**

```
A photorealistic close-up portrait of an elderly Japanese ceramicist with
deep, sun-etched wrinkles and a warm, knowing smile. He is carefully
inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched
workshop. Captured with an 85mm portrait lens, resulting in a soft, blurred
background (bokeh). The overall mood is serene and masterful.
```

### Chiến lược 2: Hình minh hoạ / Hình dán cách điệu

Nêu rõ phong cách và yêu cầu nền.

**Mẫu câu lệnh:**

```
A [style] sticker of a [subject], featuring [key characteristics] and a
[color palette]. The design should have [line style] and [shading style].
The background must be transparent.
```

**Ví dụ:**

```
A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat.
It's munching on a green bamboo leaf. Bold, clean outlines, simple
cel-shading, vibrant color palette. White background.
```

---

## Tài liệu tham khảo

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Google Search Grounding](https://ai.google.dev/gemini-api/docs/google-search)
- [Thinking in Gemini](https://ai.google.dev/gemini-api/docs/thinking)
- [Thought Signatures](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [Batch API](https://ai.google.dev/gemini-api/docs/batch-api)
- [Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [SynthID Watermark](https://ai.google.dev/responsible/docs/safeguards/synthid)
