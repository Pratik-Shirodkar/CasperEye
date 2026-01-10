import os
import boto3
import logging
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("WhaleSubscription")


class WhaleSubscriptionService:
    """Manages email subscriptions to whale alerts via SNS"""
    
    def __init__(self):
        self.sns_client = boto3.client(
            'sns',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.topic_arn = os.getenv('SNS_TOPIC_ARN')
        
        if not self.topic_arn:
            logger.warning("⚠️  SNS_TOPIC_ARN not configured. Subscriptions disabled.")
            self.enabled = False
        else:
            self.enabled = True
            logger.info("📧 Whale Subscription Service initialized")
    
    def subscribe_email(self, email: str) -> dict:
        """Subscribe an email to whale alerts"""
        if not self.enabled:
            return {"success": False, "message": "SNS not configured"}
        
        try:
            response = self.sns_client.subscribe(
                TopicArn=self.topic_arn,
                Protocol='email',
                Endpoint=email
            )
            
            subscription_arn = response.get('SubscriptionArn')
            logger.info(f"✅ Subscription created for {email}: {subscription_arn}")
            
            return {
                "success": True,
                "message": f"Confirmation email sent to {email}. Please confirm to receive alerts.",
                "subscription_arn": subscription_arn
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to subscribe {email}: {e}")
            return {
                "success": False,
                "message": f"Failed to subscribe: {str(e)}"
            }
    
    def unsubscribe(self, subscription_arn: str) -> dict:
        """Unsubscribe from whale alerts"""
        if not self.enabled:
            return {"success": False, "message": "SNS not configured"}
        
        try:
            self.sns_client.unsubscribe(SubscriptionArn=subscription_arn)
            logger.info(f"✅ Unsubscribed: {subscription_arn}")
            
            return {
                "success": True,
                "message": "Successfully unsubscribed from whale alerts"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to unsubscribe: {e}")
            return {
                "success": False,
                "message": f"Failed to unsubscribe: {str(e)}"
            }
