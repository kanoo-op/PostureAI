# PostureAI - AI 기반 운동 자세 분석 서비스

PostureAI는 인공지능을 활용하여 실시간으로 운동 자세를 분석하고 피드백을 제공하는 웹 애플리케이션입니다.

## 프로젝트 개요

카메라를 통해 사용자의 운동 자세를 실시간으로 캡처하고, TensorFlow.js와 MediaPipe Pose 모델을 사용하여 신체 관절 포인트를 감지합니다. 분석된 데이터를 바탕으로 자세 교정 피드백을 제공하여 부상을 예방하고 운동 효과를 극대화합니다.

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **AI/ML**:
  - TensorFlow.js
  - MediaPipe Pose
- **테스트**: Jest
- **기타**: jsPDF (PDF 보고서 생성)

## 주요 기능

### 1. 실시간 자세 분석
- AI가 카메라를 통해 실시간으로 운동 자세를 분석
- 관절 각도 측정 및 시각화
- 즉각적인 자세 교정 피드백 제공

### 2. 다양한 운동 지원

#### 동적 운동 분석
- **스쿼트** (`/exercise/squat`)
- **푸시업** (`/exercise/pushup`)
- **런지** (`/exercise/lunge`)
- **데드리프트** (`/exercise/deadlift`)

#### 정적 유지 운동
- **플랭크** (`/exercise/plank`)

#### 정적 자세 분석
- 서있는 자세, 앉은 자세 등 체형 불균형 분석 (`/static-posture`)

### 3. 비디오 분석 기능
- **비디오 업로드**: 녹화된 운동 영상 업로드 및 분석 (`/video-upload`)
- **비디오 분석**: 업로드된 영상의 자세 분석 결과 확인 (`/video-analysis`)

### 4. 운동 기록 관리
- 분석 결과 저장 및 히스토리 조회
- 운동별 필터링 기능
- 통계 대시보드 (총 운동 횟수, 평균 점수, 최고 점수 등)

### 5. 고급 분석 기능
- **양측 비교 대시보드**: 좌우 신체 균형 분석
- **ROM(관절 가동 범위) 분석**: 관절별 가동 범위 측정
- **속도 대시보드**: 운동 속도 및 템포 분석
- **예측 경고 시스템**: 잘못된 자세 예측 및 사전 경고
- **캘리브레이션 위저드**: 개인 맞춤 설정
- **척추 시각화**: 척추 정렬 상태 시각화
- **무릎 정렬 분석**: 무릎 편차 시각화

### 6. 결과 보고서
- 운동 세션 요약 리포트
- PDF 내보내기 기능
- 공유 기능

## 프로젝트 구조

```
src/
├── app/                          # Next.js App Router 페이지
│   ├── page.tsx                  # 홈페이지
│   ├── layout.tsx                # 루트 레이아웃
│   ├── globals.css               # 전역 스타일
│   ├── analyze/                  # 분석 모드 선택 페이지
│   ├── history/                  # 운동 기록 페이지
│   ├── result/                   # 결과 페이지
│   ├── static-posture/           # 정적 자세 분석
│   ├── video-upload/             # 비디오 업로드 페이지
│   ├── video-analysis/           # 비디오 분석 페이지
│   └── exercise/                 # 운동별 분석 페이지
│       ├── squat/
│       ├── pushup/
│       ├── lunge/
│       ├── plank/
│       └── deadlift/
│
├── components/                   # 재사용 가능한 컴포넌트
│   ├── Header.tsx                # 헤더 (네비게이션 포함)
│   ├── Navigation.tsx            # 운동 페이지 서브 네비게이션
│   ├── PoseDetector.tsx          # 자세 감지 컴포넌트
│   ├── ExerciseFeedbackView.tsx  # 운동 피드백 뷰
│   ├── ImagePoseAnalyzer.tsx     # 이미지 자세 분석기
│   ├── FeedbackPanel.tsx         # 피드백 패널
│   ├── SymmetryPanel.tsx         # 대칭성 패널
│   ├── SymmetryFeedbackCard.tsx  # 대칭성 피드백 카드
│   ├── SpineVisualization.tsx    # 척추 시각화
│   ├── SpineFeedbackCard.tsx     # 척추 피드백 카드
│   ├── KneeDeviationVisualization.tsx  # 무릎 편차 시각화
│   ├── AngleVisualization.tsx    # 각도 시각화
│   ├── AngleDashboard/           # 각도 대시보드 컴포넌트들
│   ├── VelocityDashboard/        # 속도 대시보드 컴포넌트들
│   ├── BilateralComparisonDashboard/  # 양측 비교 대시보드
│   ├── ROMDisplayPanel/          # ROM 표시 패널
│   ├── CalibrationWizard/        # 캘리브레이션 위저드
│   ├── ExerciseSummaryReport/    # 운동 요약 리포트
│   ├── PredictiveWarning/        # 예측 경고 컴포넌트
│   └── IntegratedAnalysis/       # 통합 분석 컴포넌트
│
├── contexts/                     # React Context
│   └── CalibrationContext.tsx    # 캘리브레이션 상태 관리
│
├── hooks/                        # 커스텀 훅
│   ├── useWebcam.ts              # 웹캠 제어 훅
│   ├── usePoseDetection.ts       # 자세 감지 훅
│   ├── useAngleHistory.ts        # 각도 기록 훅
│   └── useVelocityTracking.ts    # 속도 추적 훅
│
├── types/                        # TypeScript 타입 정의
│   ├── pose.ts                   # 자세 관련 타입
│   ├── angleHistory.ts           # 각도 기록 타입
│   └── velocity.ts               # 속도 관련 타입
│
└── utils/                        # 유틸리티 함수
    ├── drawSkeleton.ts           # 스켈레톤 렌더링
    ├── staticPostureAnalyzer.ts  # 정적 자세 분석기
    ├── angleHistoryTracker.ts    # 각도 기록 추적기
    ├── angleHistoryAnalyzer.ts   # 각도 기록 분석기
    ├── elbowValgusAnalyzer.ts    # 팔꿈치 외반 분석기
    ├── neckAlignmentAnalyzer.ts  # 목 정렬 분석기
    ├── pushupAnalyzer.ts         # 푸시업 분석기
    ├── plankAnalyzer.ts          # 플랭크 분석기
    ├── weightShiftAnalyzer.ts    # 체중 이동 분석기
    ├── depthNormalization.ts     # 깊이 정규화
    ├── velocityTracker.ts        # 속도 추적기
    ├── accelerationAnalyzer.ts   # 가속도 분석기
    ├── jointROMAnalyzer.ts       # 관절 ROM 분석기
    ├── torsoRotationAnalyzer.ts  # 몸통 회전 분석기
    ├── circularBuffer.ts         # 순환 버퍼
    ├── tempoFeedbackGenerator.ts # 템포 피드백 생성기
    └── __tests__/                # 테스트 파일
```

## 페이지 설명

| 경로 | 설명 |
|------|------|
| `/` | 홈페이지 - 서비스 소개 및 주요 기능 안내 |
| `/analyze` | 분석 모드 선택 - 동적/정적 운동 선택 |
| `/history` | 운동 기록 - 과거 분석 결과 조회 |
| `/video-upload` | 비디오 업로드 - 운동 영상 업로드 |
| `/video-analysis` | 비디오 분석 - 업로드된 영상 분석 결과 |
| `/exercise/squat` | 스쿼트 자세 분석 |
| `/exercise/pushup` | 푸시업 자세 분석 |
| `/exercise/lunge` | 런지 자세 분석 |
| `/exercise/plank` | 플랭크 자세 분석 |
| `/exercise/deadlift` | 데드리프트 자세 분석 |
| `/static-posture` | 정적 자세 분석 |
| `/result` | 분석 결과 페이지 |

## 설치 및 실행

### 요구 사항
- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치
```bash
npm install
```

### 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 에서 확인 가능

### 프로덕션 빌드
```bash
npm run build
npm run start
```

### 테스트 실행
```bash
npm run test
npm run test:coverage
```

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run test` | Jest 테스트 실행 |
| `npm run test:coverage` | 커버리지 포함 테스트 |
| `npm run test:pose3d` | 3D 자세 유틸 테스트 |

## 사용 방법

1. **홈페이지**에서 "분석 시작하기" 버튼 클릭
2. **분석 모드 선택**에서 원하는 운동 유형 선택
3. 카메라 권한 허용 후 운동 시작
4. 실시간으로 자세 피드백 확인
5. 운동 종료 후 **결과 페이지**에서 상세 분석 확인
6. **기록** 페이지에서 과거 운동 기록 조회

### 비디오 분석 사용법
1. **비디오 업로드** 페이지에서 운동 영상 업로드
2. 업로드 완료 후 자동으로 분석 시작
3. **비디오 분석** 페이지에서 결과 확인

## 라이선스

© 2025 PostureAI. All rights reserved.
