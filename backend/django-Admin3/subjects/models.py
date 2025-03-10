from django.db import models

class Subject(models.Model):
    code = models.CharField(max_length=10, unique=True)    
    description = models.TextField(blank=True, null=True)    
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code}: {self.description}"
    
    class Meta:
        db_table = 'subjects'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['code']
