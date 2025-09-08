"""
image_processor.py - Service for processing uploaded mobile screenshot images
Handles image validation, resizing, format conversion, and optimization
"""

from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO
import base64
import hashlib
from typing import Dict, Tuple, Optional

# Configuration constants
MAX_IMAGE_DIMENSIONS = (1080, 2340)  # Common mobile screen sizes
SUPPORTED_FORMATS = ['PNG', 'JPEG', 'JPG', 'WEBP']
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MIN_IMAGE_DIMENSIONS = (200, 200)  # Minimum usable size

def process_uploaded_image(image_bytes: bytes, filename: str) -> Dict:
    """
    Process uploaded image with validation, optimization, and conversion
    
    Args:
        image_bytes: Raw image bytes from upload
        filename: Original filename for reference
        
    Returns:
        Dict containing processed image data and metadata
    """
    try:
        # Validate image format and integrity
        validation_result = validate_image(image_bytes)
        if not validation_result['valid']:
            return {
                'success': False,
                'error': validation_result['error']
            }
        
        # Load and process image
        image = Image.open(BytesIO(image_bytes))
        original_format = image.format or 'UNKNOWN'
        original_size = image.size
        
        # Convert to RGB if needed (handles RGBA, grayscale, etc.)
        if image.mode not in ['RGB', 'L']:
            if image.mode == 'RGBA':
                # Handle transparency by creating white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])  # Use alpha channel as mask
                image = background
            else:
                image = image.convert('RGB')
        
        # Optimize image size if too large
        optimized_image = optimize_image_size(image)
        
        # Enhance image quality for better UI element visibility
        enhanced_image = enhance_image_for_ui_testing(optimized_image)
        
        # Convert to base64 for frontend
        buffered = BytesIO()
        enhanced_image.save(buffered, format='PNG', optimize=True, quality=95)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Generate image hash for caching/deduplication
        image_hash = hashlib.md5(buffered.getvalue()).hexdigest()
        
        # Calculate compression ratio
        original_size_bytes = len(image_bytes)
        compressed_size_bytes = len(buffered.getvalue())
        compression_ratio = (1 - compressed_size_bytes / original_size_bytes) * 100
        
        return {
            'success': True,
            'image_base64': f"data:image/png;base64,{img_base64}",
            'width': enhanced_image.width,
            'height': enhanced_image.height,
            'filename': filename,
            'format': 'PNG',
            'original_format': original_format,
            'original_size': original_size,
            'file_size_bytes': compressed_size_bytes,
            'original_file_size_bytes': original_size_bytes,
            'compression_ratio': round(compression_ratio, 2),
            'image_hash': image_hash,
            'processing_applied': get_processing_summary(image, enhanced_image)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"Image processing failed: {str(e)}"
        }

def validate_image(image_bytes: bytes) -> Dict:
    """
    Validate uploaded image for security and usability
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Validation result with status and details
    """
    try:
        # Check file size
        if len(image_bytes) > MAX_FILE_SIZE:
            return {
                'valid': False,
                'error': f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            }
        
        if len(image_bytes) < 1000:  # Less than 1KB is suspicious
            return {
                'valid': False,
                'error': "File too small to be a valid image"
            }
        
        # Try to load and verify image
        image = Image.open(BytesIO(image_bytes))
        image.verify()  # Verify image integrity
        
        # Reload image for further checks (verify() can only be called once)
        image = Image.open(BytesIO(image_bytes))
        
        # Check image dimensions
        width, height = image.size
        if width < MIN_IMAGE_DIMENSIONS[0] or height < MIN_IMAGE_DIMENSIONS[1]:
            return {
                'valid': False,
                'error': f"Image too small. Minimum size is {MIN_IMAGE_DIMENSIONS[0]}x{MIN_IMAGE_DIMENSIONS[1]}"
            }
        
        # Check if image format is supported
        if image.format not in SUPPORTED_FORMATS:
            return {
                'valid': False,
                'error': f"Unsupported format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
            }
        
        # Check aspect ratio (mobile screenshots should be portrait or landscape)
        aspect_ratio = width / height
        if aspect_ratio > 3 or aspect_ratio < 0.3:  # Too wide or too tall
            return {
                'valid': False,
                'error': "Unusual aspect ratio. Please upload a mobile screenshot."
            }
        
        return {
            'valid': True,
            'format': image.format,
            'dimensions': (width, height),
            'mode': image.mode,
            'file_size': len(image_bytes)
        }
        
    except Exception as e:
        return {
            'valid': False,
            'error': f"Invalid image file: {str(e)}"
        }

def optimize_image_size(image: Image.Image) -> Image.Image:
    """
    Optimize image size while maintaining quality for UI testing
    
    Args:
        image: PIL Image object
        
    Returns:
        Optimized PIL Image
    """
    width, height = image.size
    max_width, max_height = MAX_IMAGE_DIMENSIONS
    
    # Calculate scaling factor if image is too large
    if width > max_width or height > max_height:
        # Maintain aspect ratio
        scale_factor = min(max_width / width, max_height / height)
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        
        # Use high-quality resampling for better results
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    return image

def enhance_image_for_ui_testing(image: Image.Image) -> Image.Image:
    """
    Enhance image quality to improve UI element visibility
    
    Args:
        image: PIL Image object
        
    Returns:
        Enhanced PIL Image
    """
    try:
        # Slightly increase contrast to make UI elements more distinguishable
        contrast_enhancer = ImageEnhance.Contrast(image)
        image = contrast_enhancer.enhance(1.1)  # 10% contrast increase
        
        # Slightly increase sharpness for better edge definition
        sharpness_enhancer = ImageEnhance.Sharpness(image)
        image = sharpness_enhancer.enhance(1.05)  # 5% sharpness increase
        
        # Optional: Apply subtle unsharp mask for better UI element boundaries
        # This is especially helpful for screenshots with compression artifacts
        if image.size[0] * image.size[1] > 500000:  # Only for larger images
            image = image.filter(ImageFilter.UnsharpMask(radius=0.5, percent=10, threshold=2))
        
    except Exception:
        # If enhancement fails, return original image
        pass
    
    return image

def resize_image_if_needed(image_bytes: bytes, max_dimensions: Tuple[int, int] = None) -> bytes:
    """
    Resize image if it exceeds specified dimensions
    
    Args:
        image_bytes: Raw image bytes
        max_dimensions: Optional max (width, height) tuple
        
    Returns:
        Resized image bytes
    """
    if max_dimensions is None:
        max_dimensions = MAX_IMAGE_DIMENSIONS
    
    try:
        image = Image.open(BytesIO(image_bytes))
        
        if image.size[0] > max_dimensions[0] or image.size[1] > max_dimensions[1]:
            image.thumbnail(max_dimensions, Image.Resampling.LANCZOS)
            
            output = BytesIO()
            image.save(output, format='PNG', optimize=True)
            return output.getvalue()
        
        return image_bytes
        
    except Exception:
        return image_bytes

def get_image_metadata(image_bytes: bytes) -> Dict:
    """
    Extract comprehensive metadata from image
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Dictionary with image metadata
    """
    try:
        image = Image.open(BytesIO(image_bytes))
        
        # Basic metadata
        metadata = {
            'format': image.format,
            'mode': image.mode,
            'size': image.size,
            'width': image.size[0],
            'height': image.size[1],
            'file_size': len(image_bytes),
            'has_transparency': image.mode in ['RGBA', 'LA'] or 'transparency' in image.info
        }
        
        # EXIF data if available
        if hasattr(image, '_getexif') and image._getexif():
            metadata['exif'] = dict(image._getexif().items())
        
        # Additional PIL info
        metadata['info'] = image.info
        
        return metadata
        
    except Exception as e:
        return {'error': str(e)}

def get_processing_summary(original_image: Image.Image, processed_image: Image.Image) -> Dict:
    """
    Generate summary of processing applied to image
    
    Args:
        original_image: Original PIL Image
        processed_image: Processed PIL Image
        
    Returns:
        Processing summary dictionary
    """
    return {
        'size_changed': original_image.size != processed_image.size,
        'original_size': original_image.size,
        'final_size': processed_image.size,
        'format_converted': True,  # Always convert to PNG
        'enhancements_applied': ['contrast', 'sharpness'],
        'optimization_applied': True
    }

def create_thumbnail(image_bytes: bytes, thumbnail_size: Tuple[int, int] = (200, 200)) -> str:
    """
    Create thumbnail version of image for previews
    
    Args:
        image_bytes: Original image bytes
        thumbnail_size: Desired thumbnail dimensions
        
    Returns:
        Base64 encoded thumbnail image
    """
    try:
        image = Image.open(BytesIO(image_bytes))
        image.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
        
        output = BytesIO()
        image.save(output, format='PNG')
        thumbnail_base64 = base64.b64encode(output.getvalue()).decode()
        
        return f"data:image/png;base64,{thumbnail_base64}"
        
    except Exception:
        return ""
