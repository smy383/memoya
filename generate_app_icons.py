#!/usr/bin/env python3
"""
Android App Icon Generator for Memoya
이미지를 다양한 크기의 Android 아이콘으로 변환하고 적절한 위치에 배치합니다.
"""

from PIL import Image, ImageDraw
import os
import shutil

def create_rounded_icon(image, size):
    """둥근 모서리 아이콘 생성"""
    # 새 이미지 생성 (RGBA)
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # 원본 이미지 리사이즈
    img_resized = image.resize((size, size), Image.Resampling.LANCZOS)
    
    # 둥근 모서리 마스크 생성
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    
    # 둥근 사각형 그리기 (모서리 반경은 크기의 20%)
    radius = size // 5
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=255)
    
    # 마스크 적용
    icon.paste(img_resized, (0, 0))
    icon.putalpha(mask)
    
    return icon

def create_round_icon(image, size):
    """완전히 둥근 아이콘 생성"""
    # 새 이미지 생성 (RGBA)
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    # 원본 이미지 리사이즈
    img_resized = image.resize((size, size), Image.Resampling.LANCZOS)
    
    # 원형 마스크 생성
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # 마스크 적용
    icon.paste(img_resized, (0, 0))
    icon.putalpha(mask)
    
    return icon

def generate_android_icons(source_image_path):
    """Android 아이콘 생성 및 배치"""
    
    # 아이콘 크기 정의 (Android 표준)
    icon_sizes = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192
    }
    
    # 베이스 경로
    base_path = '/Users/smymac/Documents/memoya/android/app/src/main/res'
    
    try:
        # 원본 이미지 열기
        print(f"이미지 로드 중: {source_image_path}")
        original_image = Image.open(source_image_path)
        
        # RGBA로 변환 (투명도 지원)
        if original_image.mode != 'RGBA':
            original_image = original_image.convert('RGBA')
        
        # 각 해상도별로 아이콘 생성
        for folder_name, size in icon_sizes.items():
            folder_path = os.path.join(base_path, folder_name)
            
            # 폴더가 없으면 생성
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
                print(f"폴더 생성: {folder_path}")
            
            # 일반 아이콘 생성 (둥근 사각형)
            icon_regular = create_rounded_icon(original_image, size)
            regular_path = os.path.join(folder_path, 'ic_launcher.png')
            icon_regular.save(regular_path, 'PNG', optimize=True)
            print(f"생성됨: {regular_path} ({size}x{size})")
            
            # 라운드 아이콘 생성 (원형)
            icon_round = create_round_icon(original_image, size)
            round_path = os.path.join(folder_path, 'ic_launcher_round.png')
            icon_round.save(round_path, 'PNG', optimize=True)
            print(f"생성됨: {round_path} ({size}x{size})")
        
        # Google Play Store용 고해상도 아이콘 생성 (512x512)
        print("\nGoogle Play Store용 아이콘 생성 중...")
        playstore_icon = create_rounded_icon(original_image, 512)
        playstore_path = '/Users/smymac/Documents/memoya/android/app/src/main/playstore-icon.png'
        playstore_icon.save(playstore_path, 'PNG', optimize=True)
        print(f"Play Store 아이콘 생성됨: {playstore_path} (512x512)")
        
        print("\n✅ 모든 아이콘이 성공적으로 생성되었습니다!")
        print("\n📱 앱을 다시 빌드하면 새 아이콘이 적용됩니다:")
        print("   cd android && ./gradlew clean && ./gradlew assembleRelease")
        
    except FileNotFoundError:
        print(f"❌ 오류: 이미지 파일을 찾을 수 없습니다: {source_image_path}")
        print("이미지 파일 경로를 확인해주세요.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    # 제공된 이미지 경로
    source_image = "/Users/smymac/Documents/memoya/image.png"
    
    print("🎨 Memoya 앱 아이콘 생성기")
    print("=" * 50)
    
    # 이미지 파일이 있는지 확인
    if not os.path.exists(source_image):
        print(f"⚠️  이미지 파일이 없습니다: {source_image}")
        print("먼저 이미지를 다음 경로에 저장해주세요:")
        print("  /Users/smymac/Documents/memoya/memoya_logo.png")
    else:
        generate_android_icons(source_image)