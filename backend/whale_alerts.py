import os
import logging
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("WhaleAlerts")

try:
    import boto3
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False
    logger.warning("boto3 not installed. Install with: pip install boto3")


class WhaleAlertService:
    """Sends SNS notifications when whale transactions are detected"""
    
    def __init__(self):
        self.topic_arn = os.getenv('SNS_TOPIC_ARN')
        self.whale_threshold = float(os.getenv('WHALE_ALERT_THRESHOLD_BTC', 10))
        self.enabled = False
        self.sns_client = None
        
        if not HAS_BOTO3:
            logger.warning("⚠️  boto3 not installed. Whale alerts disabled.")
            return
        
        if not self.topic_arn:
            logger.warning("⚠️  SNS_TOPIC_ARN not configured. Whale alerts disabled.")
            logger.info("   Set SNS_TOPIC_ARN in .env to enable alerts")
            return
        
        try:
            self.sns_client = boto3.client(
                'sns',
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            self.enabled = True
            logger.info(f"🐋 Whale Alert Service initialized (threshold: {self.whale_threshold} BTC)")
        except Exception as e:
            logger.warning(f"⚠️  Failed to initialize SNS client: {e}")
            logger.info("   Check AWS credentials are configured")
    
    def send_alert(self, btc_amount: float, staker_addr: str, provider_name: Optional[str] = None):
        """Send SNS notification for whale transaction"""
        if btc_amount < self.whale_threshold:
            return
        
        logger.info(f"🐋 Whale detected: {btc_amount} BTC from {staker_addr}")
        
        if not self.enabled:
            logger.debug("   (SNS not configured, alert not sent)")
            return
        
        try:
            message = f"🐋 WHALE ALERT: {btc_amount} BTC moved!\n\n"
            message += f"Address: {staker_addr}\n"
            if provider_name:
                message += f"Provider: {provider_name}\n"
            message += f"Amount: {btc_amount} BTC"
            
            subject = f"🐋 Whale Alert: {btc_amount} BTC Transaction"
            
            self.sns_client.publish(
                TopicArn=self.topic_arn,
                Subject=subject,
                Message=message
            )
            
            logger.info(f"✅ Whale alert sent: {btc_amount} BTC from {staker_addr}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send whale alert: {e}")
