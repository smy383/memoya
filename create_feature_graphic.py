#!/usr/bin/env python3
"""
Google Play Feature Graphic Generator
1024x500 크기의 기능 그래픽을 생성합니다.
"""

from PIL import Image, ImageDraw
import os

def create_feature_graphic(source_image_path, output_path):
    """1024x500 기능 그래픽 생성"""
    
    try:
        # 원본 이미지 열기
        print(f"원본 이미지 로드 중: {source_image_path}")
        original_image = Image.open(source_image_path)
        
        # RGBA로 변환 (투명도 지원)
        if original_image.mode != 'RGBA':
            original_image = original_image.convert('RGBA')
        
        # 기능 그래픽 크기 (Google Play Store 표준)
        target_width = 1024
        target_height = 500
        
        # 새 캔버스 생성 (흰색 배경)
        feature_graphic = Image.new('RGB', (target_width, target_height), color='white')
        
        # 원본 이미지의 가로세로 비율 계산
        original_width, original_height = original_image.size
        
        # 이미지를 중앙에 배치하고 적절한 크기로 조정
        # 높이를 기준으로 리사이즈 (여백 고려)
        max_height = int(target_height * 0.8)  # 높이의 80% 사용
        
        # 비율 유지하며 리사이즈
        if original_height > max_height:
            scale_factor = max_height / original_height
            new_width = int(original_width * scale_factor)
            new_height = max_height
        else:
            new_width = original_width
            new_height = original_height
        
        # 이미지 리사이즈
        resized_image = original_image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 중앙 위치 계산
        x_offset = (target_width - new_width) // 2
        y_offset = (target_height - new_height) // 2
        
        # 투명도가 있는 이미지를 배경에 합성
        if resized_image.mode == 'RGBA':
            # 알파 채널을 마스크로 사용하여 합성
            feature_graphic.paste(resized_image, (x_offset, y_offset), resized_image)
        else:
            feature_graphic.paste(resized_image, (x_offset, y_offset))
        
        # 결과 저장
        feature_graphic.save(output_path, 'PNG', quality=95, optimize=True)
        print(f"✅ 기능 그래픽 생성 완료: {output_path}")
        print(f"   크기: {target_width}x{target_height}")
        
        return True
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False

if __name__ == "__main__":
    print("🎨 Google Play 기능 그래픽 생성기")
    print("=" * 50)
    
    # 입력/출력 파일 경로
    source_image = "/Users/smymac/Documents/memoya/image_1024.png"
    output_path = "/Users/smymac/Documents/memoya/feature_graphic_1024x500.png"
    
    # 이미지 파일 존재 확인
    if not os.path.exists(source_image):
        print(f"❌ 소스 이미지를 찾을 수 없습니다: {source_image}")
    else:
        success = create_feature_graphic(source_image, output_path)
        
        if success:
            print("\n📱 Google Play Console에서 사용 방법:")
            print("1. Play Console → 앱 → 스토어 설정 → 기본 스토어 등록정보")
            print("2. 그래픽 → 기능 그래픽 → 이미지 업로드")
            print(f"3. 생성된 파일 업로드: {output_path}")