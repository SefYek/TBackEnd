
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from faker import Faker
from PIL import Image, ImageDraw

from posts.models import Post


fake = Faker("fa_IR")


class Command(BaseCommand):
    help = "Create fake posts for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=20,
        )

    def handle(self, *args, **options):
        count = options["count"]

        for i in range(count):
            # ساخت تصویر نمونه
            image = Image.new(
                "RGB",
                (800, 450),
                color=(
                    fake.random_int(50, 200),
                    fake.random_int(50, 200),
                    fake.random_int(50, 200),
                ),
            )

            draw = ImageDraw.Draw(image)
            draw.text((30, 30), f"Post {i + 1}", fill="white")

            buffer = BytesIO()
            image.save(buffer, format="JPEG")

            # ساخت پست
            post = Post(
                title=fake.sentence(),
                info=fake.paragraph(nb_sentences=8),
            )

            post.image.save(
                f"post_{i + 1}.jpg",
                ContentFile(buffer.getvalue()),
                save=False,
            )

            post.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"{count} fake posts created successfully!"
            )
        )
